@AGENTS.md

# Project Rules

## Language
All user-facing text in the application (UI labels, buttons, messages, placeholders, modals, etc.) must be written in **English**. Do not use Japanese or any other language in the app UI.

## GTM Custom Events
When implementing any new feature, always follow these two steps:

1. **Propose custom events**: Before or during implementation, propose which GTM custom events should be sent and at what user actions. Use `lib/gtm.ts` to add new event functions and call them from the relevant components.

2. **Explain GTM configuration**: After implementing the events, explain what additional GTM settings are required:
   - New data layer variables (`dlv_*`) to add in Step 2
   - Whether the existing `tag_all_custom_events` tag covers it (just add new event parameters) or if a new tag is needed
   - Any new GA4 custom dimensions to register if the new parameters are useful for reporting
