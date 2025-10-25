# Workflow Design

## Overview
The workflow represents a **Security Review Process** designed to manage sensitive access requests efficiently and ensure compliance validation.

## Workflow States
1. **To Do** — Request created and pending triage.
2. **In Progress** — Assigned to a security analyst for review.
3. **Security Review** — Sensitive data validated and confirmed.
4. **Done** — Request approved and logged for audit.

## Key Transitions
| From            | To              | Condition                          |
| --------------- | --------------- | ---------------------------------- |
| To Do           | In Progress     | Automatically when assigned        |
| In Progress     | Security Review | Manual transition by Security team |
| Security Review | Done            | Upon completion of validation      |
| In Progress     | To Do           | Reopened by analyst                |

## Diagram
![Workflow Diagram](../assets/workflow-diagram.png)