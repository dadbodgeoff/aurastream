# AI-Assisted Development Spec Templates

These templates demonstrate the spec-driven development workflow I use to ship production apps with AI assistance.

## The Three Documents

Every feature I build starts with three spec documents:

1. **requirements.md** - What we're building and why (user stories + acceptance criteria)
2. **design.md** - How we're building it (architecture, components, data models)
3. **tasks.md** - The execution plan (ordered tasks with checkboxes)

## Why This Works

- **Context preservation**: AI has a single source of truth to reference
- **Drift prevention**: Specs enforce consistency across long sessions
- **Testability**: Acceptance criteria become test cases
- **Automation**: Well-structured tasks can be executed with minimal intervention

## How to Use

1. Copy the template folder for your feature
2. Fill in requirements.md first (iterate with AI until complete)
3. Generate design.md from requirements (ask AI to propose architecture)
4. Generate tasks.md from design (ask AI to break down into ordered tasks)
5. Execute tasks using AI as orchestrator

## Key Principles

- **No file over 400 lines** - keeps context manageable
- **Backend first** - APIs are testable, frontend follows
- **Modular everything** - hooks, components, services all separate
- **Test alongside** - each task should include its tests

## Folder Structure

```
.kiro/specs/
└── feature-name/
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

## License

MIT - use however you want
