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
