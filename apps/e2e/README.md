# 🎭 Playwright E2E Testing Suite

<p align="center">
  <img src="https://img.shields.io/badge/Playwright-v1.58+-45ba4b?style=for-the-badge&logo=playwright" alt="Playwright">
  <img src="https://img.shields.io/badge/TypeScript-5.9+-3178c6?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/AI--First-Workflow-00C853?style=for-the-badge" alt="AI-First">
</p>

<p align="center">
  <strong>🧪 Professional E2E Testing with AI-Assisted Development</strong><br>
  <em>Automated browser testing using Page Object Model pattern with Playwright Test framework and structured AI workflow</em>
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Commands](#-commands)
- [Creating Tests](#-creating-tests)
- [AI-Assisted Development](#-ai-assisted-development)
- [Best Practices](#-best-practices)
- [Troubleshooting](#-troubleshooting)
- [Resources](#-resources)

---

## 🎯 Overview

This repository is a **production-ready Playwright E2E testing suite template** that combines:

✅ **Page Object Model (POM)** - Maintainable, reusable test architecture
✅ **TypeScript** - Type-safe tests with IntelliSense support
✅ **AI-First Workflow** - Structured instructions for GitHub Copilot and AI assistants
✅ **Memory Bank** - Persistent context across AI sessions
✅ **Multi-browser** - Chrome, Firefox, Safari support
✅ **Debugging Tools** - Inspector, headed mode, UI mode

> **📖 New Project Setup:** See [BOOTSTRAP.md](BOOTSTRAP.md) for step-by-step initialization guide.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **🎭 Page Object Model** | Clean separation: UI structure in Page Objects, test logic in test files |
| **🧠 AI-Ready** | `AGENTS.md` instructions + Memory Bank for Copilot |
| **🔍 Smart Selectors** | Priority: `data-testid` > accessible roles > CSS selectors |
| **🚀 Fast Execution** | Parallel test execution, automatic retries on CI |
| **📊 Rich Reports** | HTML reports with screenshots, traces, and videos |
| **🐛 Debugging** | Interactive debugger, headed mode, trace viewer |
| **🔄 Persistent Memory** | AI remembers decisions and patterns between sessions |

---

## 📁 Project Structure

```
AIdevpack/
│
├── 📋 Configuration Files
│   ├── AGENTS.md                   # AI agent instructions for the whole project
│   ├── playwright.config.ts        # Playwright configuration (browsers, timeouts, reports)
│   ├── tsconfig.json               # TypeScript configuration
│   ├── package.json                # Dependencies and scripts
│   ├── .env.test                   # Environment variables template
│   └── .gitignore                  # Git exclusions
│
├── 🧪 e2e-tests/                   # Main testing folder
│   │
│   ├── 📋 AGENTS.md                # AI instructions specific to E2E testing
│   ├── 📖 README.md                # Quick start guide for E2E tests
│   │
│   ├── 📁 page-objects/            # Page Object Model classes
│   │   ├── BasePage.ts             # Base class with common methods (click, fill, etc.)
│   │   ├── LoginPage.ts            # Login page interactions (example)
│   │   ├── DashboardPage.ts        # Dashboard page interactions (example)
│   │   └── ...                     # One class per page
│   │
│   ├── 📁 tests/                   # Test files organized by feature
│   │   ├── auth/                   # Authentication tests
│   │   │   ├── login.spec.ts       # Login flow tests
│   │   │   └── logout.spec.ts      # Logout flow tests
│   │   ├── dashboard/              # Dashboard tests
│   │   │   ├── navigation.spec.ts  # Navigation tests
│   │   │   └── widgets.spec.ts     # Widget functionality tests
│   │   └── ...                     # Organized by feature/module
│   │
│   ├── 📁 fixtures/                # Test data and reusable data
│   │   ├── users.ts                # User test data (valid/invalid users)
│   │   ├── products.ts             # Product test data
│   │   └── test-data.ts            # Generic test data
│   │
│   └── 📁 utils/                   # Helper functions and utilities
│       ├── test-config.ts          # Configuration helpers
│       ├── logger.ts               # Logging utilities
│       └── helpers.ts              # Reusable helper functions
│
├── 💾 .memory-bank/                # AI persistent context (Memory Bank)
│   ├── activeContext.md            # Current task, progress, next steps
│   ├── learnings.md                # Technical patterns, known issues, solutions
│   └── userDirectives.md           # User preferences, coding style, boundaries
│
├── 📋 specs/                       # Feature specifications (optional)
│   └── README.md                   # Guide for writing feature specs
│
├── 📄 Documentation
│   ├── README.md                   # This file
│   └── ESTRUCTURA-SETUP.md         # Setup summary and next steps
│
└── 📦 Generated/Ignored
    ├── node_modules/               # npm dependencies (ignored)
    ├── playwright-report/          # HTML test reports (ignored)
    ├── test-results/               # Test artifacts (ignored)
    └── package-lock.json           # npm lock file
```

---

## 📂 Folder & File Descriptions

### **Configuration Files (Root Level)**

| File | Purpose | What It Contains |
|------|---------|------------------|
| `AGENTS.md` | AI instructions for the entire project | Project description, build commands, technology constraints, Memory Bank workflow, TDD guidelines |
| `playwright.config.ts` | Playwright configuration | Test directory, browsers (Chrome/Firefox/Safari), timeouts, reporters, screenshot/video settings |
| `tsconfig.json` | TypeScript configuration | TypeScript compiler options, includes, excludes |
| `package.json` | npm configuration | Scripts (`test`, `test:headed`, `test:debug`), dependencies (`@playwright/test`, TypeScript, dotenv) |
| `.env.test` | Environment variables | `BASE_URL`, `TEST_USERNAME`, `TEST_PASSWORD`, browser settings |
| `.gitignore` | Git exclusions | `node_modules/`, test artifacts, environment files, temporary files |

---

### **🧪 e2e-tests/** - Main Testing Folder

#### **e2e-tests/page-objects/** - Page Object Model Classes

**Purpose**: Encapsulate page structure and user interactions. Each page gets one class.

| File | What It Contains |
|------|------------------|
| `BasePage.ts` | Base class inherited by all pages. Provides common methods: `goto()`, `click()`, `fill()`, `isVisible()`, `waitForElement()`, etc. |
| `LoginPage.ts` | Login page selectors and actions: `login(email, password)`, `isLoginFormVisible()`, `getErrorMessage()` |
| `DashboardPage.ts` | Dashboard selectors and actions: navigation, widgets, user menu interactions |
| `*Page.ts` | One file per page in your application |

**Rules**:
- ✅ One class per page
- ✅ All selectors defined as private properties
- ✅ Methods represent user actions (not technical clicks)
- ✅ Inherit from `BasePage`

---

#### **e2e-tests/tests/** - Test Files

**Purpose**: Actual test specifications using Page Objects. Organized by feature/module.

| Folder | What It Tests |
|--------|---------------|
| `auth/` | Authentication flows: login, logout, password reset, registration |
| `dashboard/` | Dashboard functionality: navigation, widgets, settings |
| `checkout/` | Checkout process: cart, payment, order confirmation |
| `profile/` | User profile: edit profile, change password, preferences |

**File Naming**: `*.spec.ts` (e.g., `login.spec.ts`, `navigation.spec.ts`)

**Test Structure**: Follow AAA pattern (Arrange-Act-Assert)

**Example**:
```typescript
// tests/auth/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';

test('should log in successfully with valid credentials', async ({ page }) => {
  // ARRANGE
  const loginPage = new LoginPage(page);
  await loginPage.goto('/login');

  // ACT
  await loginPage.login('user@example.com', 'password123');

  // ASSERT
  await expect(page).toHaveURL('/dashboard');
});
```

---

#### **e2e-tests/fixtures/** - Test Data

**Purpose**: Store reusable test data (users, products, etc.)

| File | What It Contains |
|------|------------------|
| `users.ts` | User accounts: `validUser`, `invalidUser`, `adminUser` |
| `products.ts` | Product data for e-commerce tests |
| `test-data.ts` | Generic reusable data |

**Example**:
```typescript
// fixtures/users.ts
export const testUsers = {
  validUser: {
    email: 'valid@example.com',
    password: 'ValidPassword123!'
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'AdminPassword123!'
  }
};
```

---

#### **e2e-tests/utils/** - Helper Functions

**Purpose**: Reusable utility functions and configurations

| File | What It Contains |
|------|------------------|
| `test-config.ts` | Configuration helpers (loading env vars, etc.) |
| `logger.ts` | Logging utilities for debugging |
| `helpers.ts` | Generic helper functions (date formatters, random data generators, etc.) |

---

### **💾 .memory-bank/** - AI Persistent Context

**Purpose**: The AI's project journal. Remembers decisions, patterns, and context between sessions.

| File | What It Stores | When to Update |
|------|----------------|----------------|
| `activeContext.md` | Current task, progress, next steps, recent changes | After each step |
| `learnings.md` | Technical patterns, known issues, solutions, POM structure | When discovering patterns or solving issues |
| `userDirectives.md` | User preferences, coding style, boundaries | Rarely (user-driven) |

**How It Works**:
1. AI reads Memory Bank at session start
2. AI updates files as work progresses
3. Next session picks up exactly where you left off

---

### **📋 specs/** - Feature Specifications

**Purpose**: Document features before implementing tests (optional but recommended)

**Usage**:
- Create a spec for complex features: `/specs/feature-checkout/spec-checkout.md`
- Reference spec in tests for clarity
- Use with `feature-spec` skill for guided implementation

---

## 🚀 Quick Start

> **💡 Using this as a template for a new project?** See [BOOTSTRAP.md](BOOTSTRAP.md) for automated setup.

### 1️⃣ Prerequisites

- **Node.js** 18+ installed
- **Git** installed
- **VS Code** (recommended) with GitHub Copilot (optional but recommended)

### 2️⃣ Automated Setup (Recommended)

```bash
# Clone as new project
git clone "https://dev.azure.com/turingchallenge/Turing%20-%20Control%20Metodolog%C3%ADa%20QA/_git/Playwright%20y%20DEV-IA" my-project
cd my-project

# Run initialization script
# For Linux/Mac:
chmod +x init-project.sh
./init-project.sh

# For Windows (PowerShell):
.\init-project.ps1
```

The script will:
- Update project name
- Create `.env.test.local` with your app URL
- Install dependencies
- Optional: Remove example files

### 3️⃣ Manual Setup (Alternative)

If scripts don't work, follow manual steps:

```bash
# Install Dependencies
npm install
```

This installs:
- `@playwright/test` - Playwright Test framework
- `typescript` - TypeScript compiler
- `dotenv` - Environment variable loader
- `ts-node` - TypeScript execution

### Configure Environment

```bash
# Copy the template
cp .env.test .env.test.local

# Edit .env.test.local with your app URL and credentials
```

**Example `.env.test.local`**:
```env
BASE_URL=https://your-app.com
TEST_USERNAME=test-user@example.com
TEST_PASSWORD=your-test-password
```

### 4️⃣ Run Your First Test

Using the example files:

```bash
# Headed mode (see the browser)
npm run test:headed

# Or debug mode (interactive)
npm run test:debug
```

### 5️⃣ Create Your First Page Object

Delete `e2e-tests/page-objects/ExamplePage.ts` and create your own.

See [Creating Tests](#-creating-tests) section below for detailed examples.

---

## 🎮 Commands

### Test Execution

```bash
# Run all tests (headless mode, CI-friendly)
npm run test

# Run tests with visible browser (headed mode)
npm run test:headed

# Debug mode (interactive, step-through)
npm run test:debug

# UI mode (visual test runner)
npm run test:ui

# Run only Chrome tests
npm run test:e2e
```

### Specific Tests

```bash
# Run specific test file
npx playwright test e2e-tests/tests/auth/login.spec.ts

# Run tests matching pattern
npx playwright test --grep "login"

# Run specific browser
npx playwright test --project=firefox

# Run tests in specific folder
npx playwright test e2e-tests/tests/auth/
```

### Reports & Debugging

```bash
# Show HTML report
npx playwright show-report

# Show trace for failed test
npx playwright show-trace trace.zip

# Run with UI mode (interactive)
npx playwright test --ui
```

### Utility Commands

```bash
# Install browsers (if needed)
npx playwright install

# Generate code (opens codegen tool)
npx playwright codegen https://your-app.com

# Check Playwright version
npx playwright --version
```

---

## 🛠️ Creating Tests

### Step 1: Create a Page Object

**File**: `e2e-tests/page-objects/LoginPage.ts`

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // SELECTORS (prefer data-testid)
  private readonly emailInput = '[data-testid="email-input"]';
  private readonly passwordInput = '[data-testid="password-input"]';
  private readonly submitButton = '[data-testid="login-submit"]';
  private readonly errorMessage = '[data-testid="error-message"]';

  constructor(page: Page) {
    super(page);
  }

  // NAVIGATION
  async navigateToLogin() {
    await this.goto('/login');
  }

  // USER ACTIONS
  async login(email: string, password: string) {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.click(this.submitButton);
  }

  // ASSERTIONS/CHECKS
  async isLoginFormVisible(): Promise<boolean> {
    return await this.isVisible(this.emailInput);
  }

  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorMessage);
  }
}
```

---

### Step 2: Create a Test

**File**: `e2e-tests/tests/auth/login.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
  });

  test('should log in successfully with valid credentials', async ({ page }) => {
    // ARRANGE
    const email = 'user@example.com';
    const password = 'password123';

    // ACT
    await loginPage.login(email, password);

    // ASSERT
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error with invalid credentials', async () => {
    // ARRANGE
    const email = 'invalid@example.com';
    const password = 'wrong-password';

    // ACT
    await loginPage.login(email, password);

    // ASSERT
    expect(await loginPage.isErrorDisplayed()).toBe(true);
    expect(await loginPage.getErrorMessage()).toContain('Invalid credentials');
  });
});
```

---

### Step 3: Add Test Data (Optional)

**File**: `e2e-tests/fixtures/users.ts`

```typescript
export const testUsers = {
  validUser: {
    email: 'valid@example.com',
    password: 'ValidPassword123!'
  },
  invalidUser: {
    email: 'invalid@example.com',
    password: 'wrong'
  }
};
```

**Use in tests**:
```typescript
import { testUsers } from '../../fixtures/users';

test('should login with valid user', async ({ page }) => {
  await loginPage.login(testUsers.validUser.email, testUsers.validUser.password);
});
```

---

## 🤖 AI-Assisted Development

This project is optimized for AI-assisted development with **GitHub Copilot** and other AI tools.

### AGENTS.md Instructions

The `AGENTS.md` file tells AI:
- ✅ Project structure and conventions
- ✅ Build and test commands
- ✅ Selector strategy (`data-testid` first)
- ✅ Page Object Model patterns
- ✅ Test naming conventions
- ✅ TDD workflow

### Memory Bank

The `.memory-bank/` folder preserves context between AI sessions:

| File | What AI Remembers |
|------|-------------------|
| `activeContext.md` | Current work focus, progress, next steps |
| `learnings.md` | Patterns discovered, flaky test solutions, selector strategies |
| `userDirectives.md` | Your preferences, coding style |

### How to Use with Copilot

1. **Open Copilot Chat** in VS Code
2. **Ask questions** like:
   - "Create a Page Object for the checkout page"
   - "Write a test to verify successful login"
   - "Why is this test failing intermittently?"
3. **Copilot reads**:
   - `AGENTS.md` for project rules
   - `.memory-bank/` for past decisions
   - `e2e-tests/AGENTS.md` for Playwright specifics

### Useful Prompts

```
Create a Page Object for the user profile page
```

```
Write a test to verify password reset functionality
```

```
Debug why the login test fails on Firefox
```

```
Add data-testid attributes to help me write stable selectors
```

---

## 📚 Best Practices

### Selector Strategy (Priority Order)

1. **✅ `data-testid`** (Recommended)
   ```typescript
   '[data-testid="login-button"]'
   ```

2. **✅ Accessible Roles** (Good)
   ```typescript
   page.getByRole('button', { name: 'Login' })
   ```

3. **⚠️ CSS Selectors** (Avoid if possible)
   ```typescript
   '.form > button.submit'  // Brittle!
   ```

4. **❌ XPath** (Last resort)
   ```typescript
   "//button[contains(text(), 'Login')]"
   ```

---

### Test Naming Convention

Pattern: `should [expected behavior] when [condition]`

**Good Examples**:
```typescript
test('should log in successfully when valid credentials provided')
test('should show error when password is incorrect')
test('should redirect to dashboard when login succeeds')
```

**Bad Examples**:
```typescript
test('login test')
test('form validation')
test('test 1')
```

---

### Test Structure (AAA Pattern)

**Always follow Arrange-Act-Assert**:

```typescript
test('should calculate total with tax', async ({ page }) => {
  // ARRANGE - Set up data and preconditions
  const cart = new CartPage(page);
  const item = { name: 'Widget', price: 100 };

  // ACT - Perform action
  await cart.addItem(item);
  const total = await cart.getTotal();

  // ASSERT - Verify result
  expect(total).toBe(110); // 100 + 10% tax
});
```

---

### Test Independence

**Each test must be completely independent**:

✅ **Good**:
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await loginPage.login('user@example.com', 'password123');
});
```

❌ **Bad**:
```typescript
// Don't do this - tests depend on execution order!
test('1. login', async ({ page }) => { ... });
test('2. access dashboard', async ({ page }) => { ... });
test('3. logout', async ({ page }) => { ... });
```

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| **Test times out** | Element doesn't exist or selector wrong | Verify `data-testid` exists, use `--debug` mode |
| **Flaky tests** | Race conditions, missing waits | Use `waitForElement()`, avoid hardcoded `waitForTimeout()` |
| **Element not clickable** | Element covered, disabled, or not visible | Wait for visibility, check for overlays |
| **Selector breaks** | CSS selector changes with UI updates | Migrate to `data-testid` |
| **Tests slow** | Sequential execution | Enable parallelization in `playwright.config.ts` |

---

### Debugging Tools

#### 1. Debug Mode (Interactive)
```bash
npm run test:debug
```
- Step through test execution
- Inspect elements
- Run locators live

#### 2. Headed Mode (See Browser)
```bash
npm run test:headed
```
- Watch tests execute in real browser
- See what the automation is doing

#### 3. UI Mode (Visual Test Runner)
```bash
npm run test:ui
```
- Interactive test runner
- Timeline view
- Step-by-step execution

#### 4. Trace Viewer
```bash
npx playwright show-trace trace.zip
```
- View execution traces
- Enabled by default on failures

---

## 📖 Resources

### Official Documentation

- 📖 [Playwright Documentation](https://playwright.dev)
- 🎯 [Best Practices](https://playwright.dev/docs/best-practices)
- 🔍 [Locators Guide](https://playwright.dev/docs/locators)
- 🐛 [Debugging](https://playwright.dev/docs/debug)
- 📝 [Page Object Model](https://playwright.dev/docs/pom)

### AI-First Development

- 🌐 [AGENTS.md Standard](https://agents.md)
- 📚 [Awesome Copilot](https://github.com/github/awesome-copilot)
- 🎯 [Structured Autonomy](https://github.com/github/awesome-copilot/blob/main/collections/structured-autonomy.md)

### Project Files

- 📋 [`AGENTS.md`](AGENTS.md) - Global AI instructions
- 📋 [`e2e-tests/AGENTS.md`](e2e-tests/AGENTS.md) - Playwright-specific instructions
- 📋 [`ESTRUCTURA-SETUP.md`](ESTRUCTURA-SETUP.md) - Setup summary

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Maintain test independence** - No shared state between tests
2. **Follow naming conventions** - "should [behavior] when [condition]"
3. **Use Page Object Model** - No test logic in test files
4. **Add test data to fixtures** - Don't hardcode test data
5. **Update Memory Bank** - Document patterns and decisions

---

## 📄 License

MIT License - Use freely, customize for your team.

---

## 🎯 Next Steps

1. **Configure your app URL** in `.env.test.local`
2. **Create your first Page Object** for your application
3. **Write your first test** using the Page Object
4. **Run tests** with `npm run test:debug`
5. **Use Copilot** to accelerate development

Need help? Check the [e2e-tests/README.md](e2e-tests/README.md) for more examples.

---

<p align="center">
  <strong>🎭 Happy Testing!</strong><br>
  <em>Built with Playwright + TypeScript + AI-First Workflow</em>
</p>
