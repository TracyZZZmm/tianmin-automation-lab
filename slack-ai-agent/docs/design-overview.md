# Design Overview

This demo simulates an internal automation flow using **Slack + Google Apps Script + Google Sheets**.

## Objective
- Reduce manual data entry for internal requests.
- Provide instant feedback to users in Slack.
- Log structured audit data for analytics and SLA tracking.

## Architecture

Slack → Webhook (Slash Command)
↓
Google Apps Script (doPost → parseLine → appendRow)
↓
Google Sheet (audit data source)



## Key Components
- **Intent parser**: detects “Data Access” or “Risk Exception”.
- **Regex extractor**: captures system, reason, duration, priority.
- **Sheet logger**: saves records for reporting in Looker/Sheets.
- **Slack responder**: returns ephemeral messages to the user.