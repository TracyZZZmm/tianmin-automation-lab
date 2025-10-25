# System Architecture

This Jira Service Management (JSM) demo simulates an **internal security request workflow** for handling confidential data access within an organization.

## Objectives
- Demonstrate understanding of **Jira Service Management architecture**.
- Showcase configuration of **request types, SLAs, automation**, and **dashboards**.
- Integrate customer-centric thinking with security and compliance awareness.

## Components
| Component         | Description                                                  |
| ----------------- | ------------------------------------------------------------ |
| **Request Types** | Custom types like *Confidential Data Access Request (CDAR)*  |
| **Workflow**      | Custom process from To Do → In Progress → Security Review → Done |
| **SLA**           | Configured to ensure confidential tickets are resolved within 8 hours |
| **Automation**    | Rules triggered by status change or label assignment         |
| **Reports**       | SLA success rate, Requests resolved, and Time to Done        |

## Diagram
![Workflow Overview](../assets/workflow-diagram.png)