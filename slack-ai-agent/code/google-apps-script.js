/** ===== AI Compliance FAQ Bot — Minimal Stable (No Cache) =====
 *  Usage: Fill in SHEET_ID and SHEET_NAME; deploy as a web application.
 */

// ===== CONFIG =====
const SHEET_ID   = '1njeQXLIviDaAQ9WLHKW719DXemXMQT70cs9Wa5xZXzg';
const SHEET_NAME = 'Sheet1';
const VER        = 'FAQ-V3.1-STABLE';
const USE_LLM = true;
const HF_MODEL = 'google/gemma-2-2b-it';
const HF_TIMEOUT_MS = 1500; // ms

// --- Security & Compliance ---
const SENSITIVE_PATTERNS = [
  /\b(passport|ssn|social\s*security|credit\s*card|cvv|iban|swift|bic|pin|password)\b/i,
  /\b(confidential|classified|internal\s*only|trade\s*secret)\b/i,
  /\b(pii|personal\s*data|medical|hipaa|gdpr)\b/i
];


// Script Properties: SLACK_BOT_TOKEN, HUGGINGFACE_API_TOKEN

// ===== Utils =====
function Text(s){ return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); }

function helpText_(){
  return `FAQ MODE ${VER} ✅
I can help with security FAQs.
• Ask: "how to get S3 access?"
• To file a request use /request <your sentence>
• Risk exception: /request Request risk exception for <system>, <duration>, reason: <why>`;
}

function normalize_(s){
  return (s||'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
}

// ===== Sheet I/O（No Cache）=====
function loadFaq_(){
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  if (!sh){ Logger.log(`ERROR: Sheet tab not found: "${SHEET_NAME}"`); return []; }
  const values = sh.getDataRange().getValues();
  if (!values.length){ Logger.log('WARN: sheet empty'); return []; }

  const header = values.shift().map(h => (h||'').toString().trim().toLowerCase());
  const pi = header.indexOf('pattern'), ai = header.indexOf('answer');
  if (pi === -1 || ai === -1){
    Logger.log(`ERROR: Header must contain 'pattern' and 'answer' (got: ${JSON.stringify(header)})`);
    return [];
  }
  const rows = values.map(r => ({
    pattern: (r[pi]||'').toString().trim(),
    answer:  (r[ai]||'').toString().trim()
  })).filter(r => r.pattern && r.answer);

  Logger.log(`LOAD: ${rows.length} faq rows from "${SHEET_NAME}"`);
  return rows;
}

function findAnswer_(text){
  const q = normalize_(text);
  const faqs = loadFaq_();
  for (const row of faqs){
    try{
      const pat = (row.pattern || '').toString().replace(/\(\?i\)/gi,'');
      const re  = new RegExp(pat, 'i');
      if (re.test(q)){
        logHit_(q, pat, 'HIT');
        return {answer: row.answer, pattern: pat, result: 'HIT', q};
      }
    }catch(e){
      logHit_(q, row.pattern, 'REGEX_ERROR');
    }
  }
  // Weak matching fallback (expandable as needed)
  const weak = [
    {k:/\bs3\b|\bbucket\b/, a:'To request S3 access: 1) Open JSM: Security→“AWS S3 Access”…'},
    {k:/risk\s*exception|exception\s*request/, a:'Risk exception: use “Security Risk Exception” form…'},
    {k:/contact|reach.*(security|paranoids)/, a:'Contact Paranoids: Slack #paranoids-help…'}
  ];
  for (const w of weak){
    if (w.k.test(q)){
      logHit_(q, w.k.toString(), 'WEAK');
      return {answer: w.a + '\n\n(weak match)', pattern: w.k.toString(), result: 'WEAK', q};
    }
  }
  logHit_(q, '', 'MISS');
  return {answer: null, pattern: '', result: 'MISS', q};
}

// ===== Slack API =====
function getProps_(k){ return PropertiesService.getScriptProperties().getProperty(k); }

function postMessage_(channel, text, thread_ts){
  const token = getProps_('SLACK_BOT_TOKEN'); // xoxb-***
  const payload = { channel, text };
  if (thread_ts) payload.thread_ts = thread_ts;

  const res = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const out = JSON.parse(res.getContentText());
  if (!out.ok){ Logger.log('SLACK_POST_ERROR: ' + res.getContentText()); }
  return out;
}

// ===== Slack Events Entry =====
function doPost(e){
  try{
    // --- Parse & URL verification ---
    const body = (e && e.postData && e.postData.contents)
      ? JSON.parse(e.postData.contents) : {};
    if (body.type === 'url_verification') return Text(body.challenge);

    // --- Retry guard ---
    const headers = (e && e.postData && e.postData.headers) ? e.postData.headers : {};
    const retryNum = headers['X-Slack-Retry-Num'] || headers['x-slack-retry-num'];
    if (retryNum) return Text('ok'); // acknowledge retry but do nothing

    // --- Idempotency (de-dup) ---
    const cache = CacheService.getScriptCache();
    const eventId = body.event_id || '';
    if (eventId){
      const k = 'evt_' + eventId;
      if (cache.get(k)) return Text('ok');
      cache.put(k, '1', 3600); // 1h
    }

    const ev = body.event || {};
    const msgKey = 'msg_' + (ev.ts || '') + '_' + (ev.client_msg_id || '');
    if (ev.ts){
      if (cache.get(msgKey)) return Text('ok');
      cache.put(msgKey, '1', 3600); // 1h
    }

    // --- Ignore non-mentions/bot messages ---
    if (ev.subtype === 'bot_message') return Text('ok');
    if (ev.type !== 'app_mention')     return Text('ok');

    const channel = ev.channel || '';
    const plain = (ev.text || '').replace(/<@[^>]+>/g,'').trim();
    const VER_STR = (typeof VER !== 'undefined' ? VER : 'V');

    // --- Admin: /ping ---
    if (/^\/ping\b/i.test(plain)){
      if (typeof logHit_ === 'function') logHit_(plain, '', 'ADMIN');
      if (channel) postMessage_(channel, 'pong ' + VER_STR, ev.thread_ts || ev.ts);
      return Text('ok');
    }

    // --- Admin: /train ---
    if (/^\/train\b/i.test(plain)){
      let n = 0;
      try{
        if (typeof loadFaq_ === 'function') n = (loadFaq_() || []).length;
        else if (typeof getCacheFaq_ === 'function') n = (getCacheFaq_() || []).length;
      }catch(_){}
      if (typeof logHit_ === 'function') logHit_(plain, '', 'ADMIN');
      if (channel) postMessage_(channel, `Trained ✅ Loaded ${n} FAQ rows.`, ev.thread_ts || ev.ts);
      return Text('ok');
    }

    // --- Admin: /debug <text> ---
    if (/^\/debug\s+/i.test(plain)){
      const q = plain.replace(/^\/debug\s+/i,'');
      let hitObj = null;
      try{ hitObj = findAnswer_(q); }catch(_){}
      const res = (hitObj && typeof hitObj === 'object')
        ? hitObj
        : { answer: (typeof hitObj === 'string' ? hitObj : null),
            pattern: (hitObj ? '(n/a)' : ''),
            result: (hitObj ? 'HIT' : 'MISS'),
            q };
      if (typeof logHit_ === 'function') logHit_(res.q || q, res.pattern || '', 'DEBUG');
      let loaded = 0;
      try{
        if (typeof loadFaq_ === 'function') loaded = (loadFaq_() || []).length;
        else if (typeof getCacheFaq_ === 'function') loaded = (getCacheFaq_() || []).length;
      }catch(_){}
      const dbg = [
        'DEBUG',
        `q: ${res.q || q}`,
        `result: ${res.result || (res.answer ? 'HIT' : 'MISS')}`,
        `pattern: ${res.pattern || '(none)'}`,
        `loaded: ${loaded}`
      ].join('\n');
      if (channel) postMessage_(channel, dbg, ev.thread_ts || ev.ts);
      return Text('ok');
    }

    // --- Admin: /ai-status ---
    if (/^\/ai-status\b/i.test(plain)){
      const hasTok = !!getProps_('HUGGINGFACE_API_TOKEN');
      const msg = [
        'AI STATUS',
        `USE_LLM: ${typeof USE_LLM !== 'undefined' ? USE_LLM : false}`,
        `MODEL: ${typeof HF_MODEL !== 'undefined' ? HF_MODEL : '(none)'}`,
        `TOKEN_SET: ${hasTok}`
      ].join('\n');
      if (typeof logHit_ === 'function') logHit_(plain, '', 'ADMIN');
      if (channel) postMessage_(channel, msg, ev.thread_ts || ev.ts);
      return Text('ok');
    }

    // --- Admin: /ai-test <text> ---
    if (/^\/ai-test\s+/i.test(plain)){
      const q = plain.replace(/^\/ai-test\s+/i,'');
      const out = (typeof llmFallback_ === 'function') ? llmFallback_(q) : null;
      const msg = out ? `AI: ${out}` : 'AI: (null / timed out / no token)';
      if (typeof logHit_ === 'function') logHit_(q, out ? ('HF:'+HF_MODEL) : '', out ? 'AI' : 'MISS');
      if (channel) postMessage_(channel, msg, ev.thread_ts || ev.ts);
      return Text('ok');
    }

    // --- Security guard: sensitive input block ---
    if (isSensitive_(plain)){
      const msg =
          'I can’t assist with sharing or processing sensitive personal or confidential data here. ' +
          'Please remove sensitive info or file a redacted /request.';
      if (typeof logHit_ === 'function') logHit_(plain, 'SENSITIVE', 'BLOCKED');
      if (channel) postMessage_(channel, msg, ev.thread_ts || ev.ts);
      return Text('ok');
    }


    // --- Normal FAQ flow + LLM → CHAT → Help ---
    let fa = null;
    try{ fa = findAnswer_(plain); }catch(_){}
    const answerText = (fa && typeof fa === 'object') ? (fa.answer || '') : (typeof fa === 'string' ? fa : '');

    let reply = answerText;
    if (!reply) {
      // 1) Small model (can be disabled by using USE_LLM)
      const ai = (typeof llmFallback_ === 'function') ? llmFallback_(plain) : null;

      // 2) Free casual chat (if not prefixed with "chitChatFallback_", it will revert to the fixed template)
      const chat = ai ? null :
        ((typeof chitChatFallback_ === 'function')
          ? chitChatFallback_(plain)
          : ('Interesting: "' + plain + '"'));

      // 3)  Help
      reply = ai || chat || (
        `FAQ MODE ${VER_STR} ✅\n` +
        'I can help with security FAQs.\n' +
        '• Ask: "how to get S3 access?"\n' +
        '• To file a request use /request <your sentence>\n' +
        '• Risk exception: /request Request risk exception for <system>, <duration>, reason: <why>'
      );

      if (typeof logHit_ === 'function') {
        if (ai) logHit_(plain, 'HF:'+HF_MODEL, 'AI');
        else if (chat) logHit_(plain, 'CHAT', 'CHAT');
        else logHit_(plain, '', 'MISS');
      }
    }

    if (channel) postMessage_(channel, reply, ev.thread_ts || ev.ts);
    return Text('ok');

  }catch(err){
    try{
      if (typeof logHit_ === 'function') logHit_('EXCEPTION', (err && (err.message || err.toString())) || '', 'ERROR');
    }catch(_){}
    return Text('ok'); // never throw; avoid Slack retry storm
  }
}


// Optional: Open the WebApp URL directly in the browser for heartbeats.
function doGet(){ return Text('pong ' + (typeof VER!=='undefined'?VER:'')); }

// ===== Local Debug（No via Slack）=====
function debugFaq_(){
  const tests = [
    'how to get s3 access?',
    'need risk exception for snowflake 14 days',
    'who to contact security?',
    'vpn access',
    'how to raise jsm ticket'
  ];
  tests.forEach(t => Logger.log(`${t} -> ${findAnswer_(t) || '[HELP]'}`));
}

// ===== Logs =====
function logHit_(q, pattern, result){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName('Logs');
  if (!sh) sh = ss.insertSheet('Logs');
  sh.appendRow([ new Date(), maskText_(q), maskText_(pattern), result ]);
}



// (Optionally) Example of Synonym Normalization: Currently not in use
function synonyms_(q){
  return q.replace(/\bgh\b/g,'github')
          .replace(/risk\s*(ex(cep)?tion|exc)\b/g,'risk exception')
          .replace(/jsm|jira service management/gi,'jira')
          .replace(/bucket(s)?/g,'bucket')
          .replace(/sec(urity)?/g,'security');
}

// ===== LLM fallback (Hugging Face) =====
function llmFallback_(q){
  if (!USE_LLM) return null;
  const token = getProps_('HUGGINGFACE_API_TOKEN');
  if (!token) return null;

  const prompt =
    'You are a concise Slack helper in a security/compliance channel.\n' +
    'If unsure, suggest using /request. Reply <= 2 lines. No markdown.\n' +
    'User: ' + q + '\nAssistant:';

  const url = 'https://api-inference.huggingface.co/models/' + HF_MODEL;
  const payload = {
    inputs: prompt,
    parameters: { max_new_tokens: 80, temperature: 0.3, top_p: 0.9, return_full_text: false }
  };

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type':'application/json' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      timeout: HF_TIMEOUT_MS
    });

    if (res.getResponseCode() !== 200) return null;

    const data = JSON.parse(res.getContentText());
    let text = '';
    if (Array.isArray(data) && data[0] && typeof data[0].generated_text === 'string') {
      text = data[0].generated_text;
    } else if (typeof data.generated_text === 'string') {
      text = data.generated_text;
    }
    text = (text || '').trim();
    if (!text) return null;

    const lines = text.split('\n').map(s => s.trim()).filter(Boolean).slice(0,2);
    return lines.join(' ');
  } catch (e) {
    return null; // Network / Timeout / Throttling → Degradation
  }
}

function isSensitive_(q){
  const t = (q || '').toString();
  return SENSITIVE_PATTERNS.some(re => re.test(t));
}

function maskText_(s){
  const str = (s || '').toString();
  if (!str) return '';
  const keep = 3;                      // Keep only the first three characters
  return (str.length <= keep) ? '*'.repeat(str.length) : (str.slice(0,keep) + '…[' + str.length + ']');
}




/** ===== AI Compliance FAQ Bot — Minimal Stable (No Cache) =====
 *  Usage: Fill in SHEET_ID and SHEET_NAME; deploy as a web application.
 */

// ===== CONFIG =====
const SHEET_ID   = '1njeQXLIviDaAQ9WLHKW719DXemXMQT70cs9Wa5xZXzg';
const SHEET_NAME = 'Sheet1';
const VER        = 'FAQ-V3.1-STABLE';
const USE_LLM = true;
const HF_MODEL = 'google/gemma-2-2b-it';
const HF_TIMEOUT_MS = 1500; // ms

// --- Security & Compliance ---
const SENSITIVE_PATTERNS = [
  /\b(passport|ssn|social\s*security|credit\s*card|cvv|iban|swift|bic|pin|password)\b/i,
  /\b(confidential|classified|internal\s*only|trade\s*secret)\b/i,
  /\b(pii|personal\s*data|medical|hipaa|gdpr)\b/i
];


// Script Properties: SLACK_BOT_TOKEN, HUGGINGFACE_API_TOKEN

// ===== Utils =====
function Text(s){ return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); }

function helpText_(){
  return `FAQ MODE ${VER} ✅
I can help with security FAQs.
• Ask: "how to get S3 access?"
• To file a request use /request <your sentence>
• Risk exception: /request Request risk exception for <system>, <duration>, reason: <why>`;
}

function normalize_(s){
  return (s||'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
}

// ===== Sheet I/O（No Cache）=====
function loadFaq_(){
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  if (!sh){ Logger.log(`ERROR: Sheet tab not found: "${SHEET_NAME}"`); return []; }
  const values = sh.getDataRange().getValues();
  if (!values.length){ Logger.log('WARN: sheet empty'); return []; }

  const header = values.shift().map(h => (h||'').toString().trim().toLowerCase());
  const pi = header.indexOf('pattern'), ai = header.indexOf('answer');
  if (pi === -1 || ai === -1){
    Logger.log(`ERROR: Header must contain 'pattern' and 'answer' (got: ${JSON.stringify(header)})`);
    return [];
  }
  const rows = values.map(r => ({
    pattern: (r[pi]||'').toString().trim(),
    answer:  (r[ai]||'').toString().trim()
  })).filter(r => r.pattern && r.answer);

  Logger.log(`LOAD: ${rows.length} faq rows from "${SHEET_NAME}"`);
  return rows;
}

function findAnswer_(text){
  const q = normalize_(text);
  const faqs = loadFaq_();
  for (const row of faqs){
    try{
      const pat = (row.pattern || '').toString().replace(/\(\?i\)/gi,'');
      const re  = new RegExp(pat, 'i');
      if (re.test(q)){
        logHit_(q, pat, 'HIT');
        return {answer: row.answer, pattern: pat, result: 'HIT', q};
      }
    }catch(e){
      logHit_(q, row.pattern, 'REGEX_ERROR');
    }
  }
  // Weak matching fallback (expandable as needed)
  const weak = [
    {k:/\bs3\b|\bbucket\b/, a:'To request S3 access: 1) Open JSM: Security→“AWS S3 Access”…'},
    {k:/risk\s*exception|exception\s*request/, a:'Risk exception: use “Security Risk Exception” form…'},
    {k:/contact|reach.*(security|paranoids)/, a:'Contact Paranoids: Slack #paranoids-help…'}
  ];
  for (const w of weak){
    if (w.k.test(q)){
      logHit_(q, w.k.toString(), 'WEAK');
      return {answer: w.a + '\n\n(weak match)', pattern: w.k.toString(), result: 'WEAK', q};
    }
  }
  logHit_(q, '', 'MISS');
  return {answer: null, pattern: '', result: 'MISS', q};
}

// ===== Slack API =====
function getProps_(k){ return PropertiesService.getScriptProperties().getProperty(k); }

function postMessage_(channel, text, thread_ts){
  const token = getProps_('SLACK_BOT_TOKEN'); // xoxb-***
  const payload = { channel, text };
  if (thread_ts) payload.thread_ts = thread_ts;

  const res = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const out = JSON.parse(res.getContentText());
  if (!out.ok){ Logger.log('SLACK_POST_ERROR: ' + res.getContentText()); }
  return out;
}

// ===== Slack Events Entry =====
function doPost(e){
  try{
    // --- Parse & URL verification ---
    const body = (e && e.postData && e.postData.contents)
      ? JSON.parse(e.postData.contents) : {};
    if (body.type === 'url_verification') return Text(body.challenge);

    // --- Retry guard ---
    const headers = (e && e.postData && e.postData.headers) ? e.postData.headers : {};
    const retryNum = headers['X-Slack-Retry-Num'] || headers['x-slack-retry-num'];
    if (retryNum) return Text('ok'); // acknowledge retry but do nothing

    // --- Idempotency (de-dup) ---
    const cache = CacheService.getScriptCache();
    const eventId = body.event_id || '';
    if (eventId){
      const k = 'evt_' + eventId;
      if (cache.get(k)) return Text('ok');
      cache.put(k, '1', 3600); // 1h
    }

    const ev = body.event || {};
    const msgKey = 'msg_' + (ev.ts || '') + '_' + (ev.client_msg_id || '');
    if (ev.ts){
      if (cache.get(msgKey)) return Text('ok');
      cache.put(msgKey, '1', 3600); // 1h
    }

    // --- Ignore non-mentions/bot messages ---
    if (ev.subtype === 'bot_message') return Text('ok');
    if (ev.type !== 'app_mention')     return Text('ok');

    const channel = ev.channel || '';
    const plain = (ev.text || '').replace(/<@[^>]+>/g,'').trim();
    const VER_STR = (typeof VER !== 'undefined' ? VER : 'V');

    // --- Admin: /ping ---
    if (/^\/ping\b/i.test(plain)){
      if (typeof logHit_ === 'function') logHit_(plain, '', 'ADMIN');
      if (channel) postMessage_(channel, 'pong ' + VER_STR, ev.thread_ts || ev.ts);
      return Text('ok');
    }

    // --- Admin: /train ---
    if (/^\/train\b/i.test(plain)){
      let n = 0;
      try{
        if (typeof loadFaq_ === 'function') n = (loadFaq_() || []).length;
        else if (typeof getCacheFaq_ === 'function') n = (getCacheFaq_() || []).length;
      }catch(_){}
      if (typeof logHit_ === 'function') logHit_(plain, '', 'ADMIN');
      if (channel) postMessage_(channel, `Trained ✅ Loaded ${n} FAQ rows.`, ev.thread_ts || ev.ts);
      return Text('ok');
    }

    // --- Admin: /debug <text> ---
    if (/^\/debug\s+/i.test(plain)){
      const q = plain.replace(/^\/debug\s+/i,'');
      let hitObj = null;
      try{ hitObj = findAnswer_(q); }catch(_){}
      const res = (hitObj && typeof hitObj === 'object')
        ? hitObj
        : { answer: (typeof hitObj === 'string' ? hitObj : null),
            pattern: (hitObj ? '(n/a)' : ''),
            result: (hitObj ? 'HIT' : 'MISS'),
            q };
      if (typeof logHit_ === 'function') logHit_(res.q || q, res.pattern || '', 'DEBUG');
      let loaded = 0;
      try{
        if (typeof loadFaq_ === 'function') loaded = (loadFaq_() || []).length;
        else if (typeof getCacheFaq_ === 'function') loaded = (getCacheFaq_() || []).length;
      }catch(_){}
      const dbg = [
        'DEBUG',
        `q: ${res.q || q}`,
        `result: ${res.result || (res.answer ? 'HIT' : 'MISS')}`,
        `pattern: ${res.pattern || '(none)'}`,
        `loaded: ${loaded}`
      ].join('\n');
      if (channel) postMessage_(channel, dbg, ev.thread_ts || ev.ts);
      return Text('ok');
    }

    // --- Admin: /ai-status ---
    if (/^\/ai-status\b/i.test(plain)){
      const hasTok = !!getProps_('HUGGINGFACE_API_TOKEN');
      const msg = [
        'AI STATUS',
        `USE_LLM: ${typeof USE_LLM !== 'undefined' ? USE_LLM : false}`,
        `MODEL: ${typeof HF_MODEL !== 'undefined' ? HF_MODEL : '(none)'}`,
        `TOKEN_SET: ${hasTok}`
      ].join('\n');
      if (typeof logHit_ === 'function') logHit_(plain, '', 'ADMIN');
      if (channel) postMessage_(channel, msg, ev.thread_ts || ev.ts);
      return Text('ok');
    }

    // --- Admin: /ai-test <text> ---
    if (/^\/ai-test\s+/i.test(plain)){
      const q = plain.replace(/^\/ai-test\s+/i,'');
      const out = (typeof llmFallback_ === 'function') ? llmFallback_(q) : null;
      const msg = out ? `AI: ${out}` : 'AI: (null / timed out / no token)';
      if (typeof logHit_ === 'function') logHit_(q, out ? ('HF:'+HF_MODEL) : '', out ? 'AI' : 'MISS');
      if (channel) postMessage_(channel, msg, ev.thread_ts || ev.ts);
      return Text('ok');
    }

    // --- Security guard: sensitive input block ---
    if (isSensitive_(plain)){
      const msg =
          'I can’t assist with sharing or processing sensitive personal or confidential data here. ' +
          'Please remove sensitive info or file a redacted /request.';
      if (typeof logHit_ === 'function') logHit_(plain, 'SENSITIVE', 'BLOCKED');
      if (channel) postMessage_(channel, msg, ev.thread_ts || ev.ts);
      return Text('ok');
    }


    // --- Normal FAQ flow + LLM → CHAT → Help ---
    let fa = null;
    try{ fa = findAnswer_(plain); }catch(_){}
    const answerText = (fa && typeof fa === 'object') ? (fa.answer || '') : (typeof fa === 'string' ? fa : '');

    let reply = answerText;
    if (!reply) {
      // 1) Small model (can be disabled by using USE_LLM)
      const ai = (typeof llmFallback_ === 'function') ? llmFallback_(plain) : null;

      // 2) Free casual chat (if not prefixed with "chitChatFallback_", it will revert to the fixed template)
      const chat = ai ? null :
        ((typeof chitChatFallback_ === 'function')
          ? chitChatFallback_(plain)
          : ('Interesting: "' + plain + '"'));

      // 3)  Help
      reply = ai || chat || (
        `FAQ MODE ${VER_STR} ✅\n` +
        'I can help with security FAQs.\n' +
        '• Ask: "how to get S3 access?"\n' +
        '• To file a request use /request <your sentence>\n' +
        '• Risk exception: /request Request risk exception for <system>, <duration>, reason: <why>'
      );

      if (typeof logHit_ === 'function') {
        if (ai) logHit_(plain, 'HF:'+HF_MODEL, 'AI');
        else if (chat) logHit_(plain, 'CHAT', 'CHAT');
        else logHit_(plain, '', 'MISS');
      }
    }

    if (channel) postMessage_(channel, reply, ev.thread_ts || ev.ts);
    return Text('ok');

  }catch(err){
    try{
      if (typeof logHit_ === 'function') logHit_('EXCEPTION', (err && (err.message || err.toString())) || '', 'ERROR');
    }catch(_){}
    return Text('ok'); // never throw; avoid Slack retry storm
  }
}


// Optional: Open the WebApp URL directly in the browser for heartbeats.
function doGet(){ return Text('pong ' + (typeof VER!=='undefined'?VER:'')); }

// ===== Local Debug（No via Slack）=====
function debugFaq_(){
  const tests = [
    'how to get s3 access?',
    'need risk exception for snowflake 14 days',
    'who to contact security?',
    'vpn access',
    'how to raise jsm ticket'
  ];
  tests.forEach(t => Logger.log(`${t} -> ${findAnswer_(t) || '[HELP]'}`));
}

// ===== Logs =====
function logHit_(q, pattern, result){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName('Logs');
  if (!sh) sh = ss.insertSheet('Logs');
  sh.appendRow([ new Date(), maskText_(q), maskText_(pattern), result ]);
}



// (Optionally) Example of Synonym Normalization: Currently not in use
function synonyms_(q){
  return q.replace(/\bgh\b/g,'github')
          .replace(/risk\s*(ex(cep)?tion|exc)\b/g,'risk exception')
          .replace(/jsm|jira service management/gi,'jira')
          .replace(/bucket(s)?/g,'bucket')
          .replace(/sec(urity)?/g,'security');
}

// ===== LLM fallback (Hugging Face) =====
function llmFallback_(q){
  if (!USE_LLM) return null;
  const token = getProps_('HUGGINGFACE_API_TOKEN');
  if (!token) return null;

  const prompt =
    'You are a concise Slack helper in a security/compliance channel.\n' +
    'If unsure, suggest using /request. Reply <= 2 lines. No markdown.\n' +
    'User: ' + q + '\nAssistant:';

  const url = 'https://api-inference.huggingface.co/models/' + HF_MODEL;
  const payload = {
    inputs: prompt,
    parameters: { max_new_tokens: 80, temperature: 0.3, top_p: 0.9, return_full_text: false }
  };

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type':'application/json' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      timeout: HF_TIMEOUT_MS
    });

    if (res.getResponseCode() !== 200) return null;

    const data = JSON.parse(res.getContentText());
    let text = '';
    if (Array.isArray(data) && data[0] && typeof data[0].generated_text === 'string') {
      text = data[0].generated_text;
    } else if (typeof data.generated_text === 'string') {
      text = data.generated_text;
    }
    text = (text || '').trim();
    if (!text) return null;

    const lines = text.split('\n').map(s => s.trim()).filter(Boolean).slice(0,2);
    return lines.join(' ');
  } catch (e) {
    return null; // Network / Timeout / Throttling → Degradation
  }
}

function isSensitive_(q){
  const t = (q || '').toString();
  return SENSITIVE_PATTERNS.some(re => re.test(t));
}

function maskText_(s){
  const str = (s || '').toString();
  if (!str) return '';
  const keep = 3;                      // Keep only the first three characters
  return (str.length <= keep) ? '*'.repeat(str.length) : (str.slice(0,keep) + '…[' + str.length + ']');
}




