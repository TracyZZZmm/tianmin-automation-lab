License
This project is licensed under the GNU AGPLv3 license.
You can use, modify, and redistribute the code.
If you run this project as a network-accessible service (SaaS, API, internal tool), you must release your modified source code.
Closed-source or proprietary use as a hosted service is not permitted.
For the full license text, see the LICENSE file.

# 🌐 Tianmin Zhang – Security Automation Portfolio

This repository demonstrates **end-to-end automation workflows** for security and compliance operations — connecting **Slack**, **Jira Service Management**, **Google Apps Script**, **Looker Studio**, and **Hugging Face API**.  

It showcases how to automate **request triage**, **SLA tracking**, and **audit analytics**, turning manual review processes into intelligent, measurable systems.

---

## 🎯 Problem This Project Solves

Security and compliance reviews in enterprise environments are often **slow, manual, and fragmented**, requests come through Slack or email, approvals happen in Jira, and reporting is done in spreadsheets.  
This fragmentation leads to:
- Delayed responses and SLA breaches  
- Repeated manual data entry  
- Lack of centralized visibility and accountability  

Inspired by real conversations with security leads, this project directly addresses pain points such as:
- **Disorganized requests:** Slack AI Agent captures and classifies requests instantly.  
- **Unstructured approvals:** Jira workflows enforce data completeness and standardized formats.  
- **No SLA tracking:** SLA rules in Jira + Looker dashboards make compliance measurable.  
- **No unified reporting:** Google Sheets + Looker Studio generate live compliance metrics.  
- **Knowledge fragmentation:** Hugging Face NLP enables intelligent FAQs and intent detection.

Together, these integrations transform ad-hoc reviews into a **traceable, data-driven automation system**.

---

## ⏱️ Efficiency Impact (with Benchmarks)

According to industry statistics — from Zendesk, Freshworks (Freshdesk), and HDI/MetricNet — the average handle time (AHT) for support tickets ranges across **~3 to 10 minutes per case**:

- Zendesk: reports a “good” AHT around ~6 minutes, with sector ranges from ~3–4 min (retail) to ~8–10 min (technical support).  
  Source: [Average Handle Time – Zendesk](https://www.zendesk.co.uk/blog/average-handle-time/)
- Freshworks (Freshdesk): summarises AHT definitions and sector benchmarks around the ~5-minute magnitude.  
  Source: [Average Handle Time – Freshworks](https://www.freshworks.com/customer-service/average-handle-time/)
- HDI/MetricNet: average ticket handle time ~8.6 minutes.  
  Source: [Ticket Handle Time – Metric of the Month, HDI](https://www.thinkhdi.com/library/supportworld/2019/metric-of-month-ticket-handle-time)

In the context of request triage and structured data entry (rather than full troubleshooting), using a conservative baseline of **~4.5 minutes per request** is reasonable.

With this automation framework:  
- **Before:** ~4.5 minutes per request (manual triage + data entry)  
- **After:** **<1 minute** per request (Slack agent → structured fields → auto-log)  
- **Time saved:** ~70% per request.  

If the team processes **40 requests per week**, that equates to ~144 minutes saved weekly (~2.4 hours/week); over a 50-week year, that’s **~150+ hours (~19 workdays)** returned to the team.

---

## 🧩 Case Studies

### 1️⃣ Slack AI Agent – Compliance Assistant
🤖 Automates internal requests through Slack using Google Apps Script.
- Detects intent (Data Access / Risk Exception)
- Logs structured data to Google Sheets
- Responds with ephemeral feedback in Slack
- Integrates with Jira APIs

📂 Folder: [`slack-ai-agent/`](./slack-ai-agent)

---

### 2️⃣ Jira Service Management Demo – Confidential Request Workflow
🧱 Simulates an end-to-end ITSM workflow for **Confidential Data Access Requests (CDAR)**.
- Workflow: To Do → In Progress → Security Review → Done  
- Automation: SLA tracking and notification rules  
- Dashboard: SLA success rate and time-to-resolution  
- AI Exploration: Atlassian Intelligence integration path  

📂 Folder: [`jira-demo/`](./jira-demo)

---

## ⚙️ Tech Stack
- **Slack API / Webhooks** – for user interaction and command triggers  
- **Google Apps Script** – backend logic and data routing  
- **Google Sheets** – structured audit and SLA tracking  
- **Looker Studio** – real-time compliance analytics  
- **Jira Service Management** – workflow automation and SLA enforcement  
- **Hugging Face API** – intent classification and contextual response generation  
- **Markdown Documentation / GitHub Portfolio** – reproducible documentation and showcase

---

## 🚀 Evolution & Strategic Impact

This system already delivers an **end-to-end automation pipeline** that eliminates manual triage and improves SLA visibility for security teams.  
Beyond the current scope, it’s designed as a **scalable architecture** ready for deeper intelligence and enterprise integration.

| Capability | Delivered | Strategic Extension |
|-------------|------------|----------------------|
| **Request Automation** | Slack → Google Sheet → Jira | Extend to REST API-based auto-ticket creation |
| **Intent Understanding** | Hugging Face model for basic classification | Fine-tune for multilingual & contextual detection |
| **SLA Visibility** | Jira metrics visualized in Looker Studio | Add anomaly alerts and predictive analytics |
| **Audit Traceability** | Logged via Google Sheets | Migrate to centralized data lake for compliance reporting |

> Rather than a prototype, this is a **production-ready blueprint** that demonstrates how automation can reduce operational friction, improve traceability, and accelerate security decision-making.

---

## 📈 Vision
This portfolio reflects my transition from **KYC Investigation (Amazon Ireland)** to **Cloud Automation & Solution Engineering**, demonstrating:
- System design and process automation thinking  
- Cross-platform integration skills  
- Customer-oriented security and compliance mindset  

---

## 📜 License
This project is licensed under the [MIT License](./LICENSE).

---

*Last updated: October 2025*
