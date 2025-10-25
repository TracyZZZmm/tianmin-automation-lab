// ======== CONFIGURATION ========
const SHEET_ID = '1a4NNmfgTKIu90bGnkeXbRM3QDiMu6EyaV0AJ1WUg8Bo'; // The string between /d/ and /edit in the Sheet URL
const SHEET_NAME = 'events'; // Sheet tab name (bottom left)
const SYSTEM_CANDIDATES = ['Payments','Ads','Search','Mail','Commerce','Auth','Billing','DataLake','S3']; // Recognizable system names (you can edit this list)

// ======== UTILITY FUNCTIONS ========
function pick(re, s, def){ const m = s.match(re); return m ? (m[1]||m[0]).trim() : def || ''; }
function anyKw(s, kws){ const t = s.toLowerCase(); return kws.some(k=>t.toLowerCase().includes(k.toLowerCase())); }

function extractSystem(text){
  const reg = new RegExp('\\b(' + SYSTEM_CANDIDATES.join('|') + ')\\b','i');
  let sys = pick(reg, text, '');
  if (sys) return sys;
  sys = pick(/(?:system|service|dataset|库|表|bucket)\s*[:：]?\s*([A-Za-z0-9_.\-:/]+)/i, text, '');
  if (/^\d+$/.test(sys)) sys = '';
  return sys || 'To be filled';
}

function extractReason(text){
  let r = pick(/(?:because|reason|原因)\s*[:：]?\s*(.+)$/i, text, '');
  if (!r) r = pick(/(false positive|compatibility issue|short release window|temporary requirement|dependency issue|compliance|debugging need|insufficient permission)/i, text, '');
  return r || 'To be filled';
}

function extractDurationDays(text, defDays){
  let m = pick(/(\d+)\s*(?:days?|d)/i, text, '');
  if (m) return parseInt(m.match(/\d+/)[0],10);
  m = pick(/(\d+)\s*(?:weeks?|w)/i, text, '');
  if (m) return parseInt(m.match(/\d+/)[0],10)*7;
  if (/one week/.test(text)) return 7;
  if (/two weeks|two week/.test(text)) return 14;
  return defDays;
}

function extractPriority(text, defP){
  const p = pick(/\b(P1|P2|P3)\b/i, text, '');
  return p ? p.toUpperCase() : defP;
}

function parseLine(nl){
  const text = nl.trim();
  const isDA = anyKw(text, ['access','permission','read','write','view','grant','read access','write access']);
  if (isDA){
    return {
      intent: 'Data Access',
      system: extractSystem(text),
      reason: extractReason(text),
      duration_days: extractDurationDays(text, 7),
      priority: extractPriority(text, 'P3')
    };
  } else {
    const sys = extractSystem(text);
    const defP = (['Payments','Auth'].includes(sys)) ? 'P1' : 'P2';
    return {
      intent: 'Risk Exception',
      system: sys,
      reason: extractReason(text),
      duration_days: extractDurationDays(text, 30),
      priority: extractPriority(text, defP)
    };
  }
}

// ======== SLACK SLASH COMMAND ENTRY ========
// Slack will POST x-www-form-urlencoded body containing text/user_name etc.
function doPost(e) {
  try {
    const params = e?.parameter || {};
    const text = params.text || '';
    const parsed = parseLine(text);

    // Append to Google Sheet (column order must match your Looker data source)
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAME);
    sh.appendRow([parsed.intent, parsed.system, parsed.reason, parsed.duration_days, parsed.priority, '']); 
    // Note: The SLA_Breached column can be auto-calculated in Sheet (e.g. D>14 → Yes/No)

    // Respond to Slack within 3s (ephemeral = only visible to the sender)
    const body = {
      response_type: 'ephemeral',
      text: `✅ Recorded\nintent: ${parsed.intent}\nsystem: ${parsed.system}\nreason: ${parsed.reason}\nduration_days: ${parsed.duration_days}\npriority: ${parsed.priority}`
    };
    return ContentService.createTextOutput(JSON.stringify(body))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    const body = { response_type:'ephemeral', text: `❌ Failed: ${err}` };
    return ContentService.createTextOutput(JSON.stringify(body))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
