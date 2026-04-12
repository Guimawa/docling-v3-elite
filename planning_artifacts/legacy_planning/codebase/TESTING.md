# Testing Patterns

**Analysis Date:** 2026-03-17

## Test Framework

**Runner:**
- Python: pytest 8+ via `uv sync` (dev dependencies in `pyproject.toml`)
- JavaScript: Vitest with `jsdom` environment (configured in `vite.config.js`)

**Assertion Library:**
- Python: standard pytest assertions (e.g., `assert` statements, no custom library)
- JavaScript: `@testing-library/react` (render, screen, fireEvent) + `@testing-library/user-event` for interactions

**Run Commands:**

```bash
# Backend
cd apps/api
pytest                  # Run all tests
pytest -v              # Verbose output
pytest --cov           # Coverage report
pytest -k test_auth    # Filter by name
pytest -m security     # Run marked tests

# Frontend
cd apps/pwa
npm run test           # Run all tests (via Vitest)
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

## Test File Organization

**Location:**

**Python:**
- Unit tests: co-located with source (e.g., `services/test_auth_service.py`, `core/test_config.py`)
- Integration/E2E tests: `tests/` directory tree mirroring structure
  - `tests/api/` — API endpoint tests
  - `tests/data_integrity/` — Database coherence tests
  - `tests/e2e/` — Full flow tests (Playwright)
  - `tests/external_services/` — Gemini/Storj integration tests
  - `tests/integration/` — Database/storage integration
  - `tests/performance/` — Load/timing tests
  - `tests/security/` — Auth bypass, injection, isolation tests

**JavaScript:**
- Components: `src/components/__tests__/` (e.g., `Button.test.jsx`, `Card.test.jsx`)
- Features: `src/features/*/` with `__tests__` subdirectory (e.g., `src/features/catalogue/__tests__/CataloguePage.test.jsx`)
- Root tests: `src/__tests__/` for setup and global tests
- Setup file: `src/__tests__/setup.js` (mocks, global config)

**Naming:**
- Python: `test_*.py` files, test classes `Test*`, test functions `test_*`
- JavaScript: `*.test.jsx` or `*.spec.jsx`

## Test Structure

**Python Suite Organization:**

```python
class TestPasswordHashing:
    def test_hash_and_verify(self):
        pwd = "MonSuperMotDePasse!123"
        hashed = hash_password(pwd)
        assert hashed.startswith("$argon2")
        assert verify_password(pwd, hashed)

    def test_wrong_password_fails(self):
        hashed = hash_password("correct")
        assert not verify_password("incorrect", hashed)
```

**Patterns:**
- Organize by feature in classes (e.g., `TestPasswordHashing`, `TestJWT`)
- One assertion per test function (or related assertions in same test)
- Setup via fixtures (pytest) or class methods
- Fixtures use dependency injection (see `conftest.py`)

**JavaScript Test Structure:**

```javascript
describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('applies primary variant class by default', () => {
    const { container } = render(<Button>Primary</Button>)
    const button = container.querySelector('button')
    expect(button).toHaveClass('bg-cta')
  })
})
```

**Patterns:**
- Describe blocks organize test suites
- One behavior per `it()` block
- Use `screen` queries (accessible-first): `getByRole()`, `getByText()`, `getByTestId()`
- Use `userEvent` for realistic interactions (not `fireEvent`)

## Async Testing

**Python:**

```python
import pytest

@pytest.mark.asyncio
async def test_extract_invoice_async():
    result = await Orchestrator.process_upload(
        file_content=b"...",
        filename="facture.pdf"
    )
    assert result["status"] == "success"
```

- Mark with `@pytest.mark.asyncio`
- Use `async def` and `await` naturally
- `asyncio_mode = "auto"` in `pytest.ini` auto-handles event loop

**JavaScript:**

```javascript
it('calls onClick when clicked', async () => {
  const user = userEvent.setup()
  const handleClick = vi.fn()
  render(<Button onClick={handleClick}>Click</Button>)

  await user.click(screen.getByText('Click'))
  expect(handleClick).toHaveBeenCalledTimes(1)
})
```

- Use `async/await` with user event setup
- Wait for promises: `await user.click()`, `await waitFor()`
- Mock promises: `vi.fn().mockResolvedValue(data)`

## Mocking

**Framework:** Python uses standard `unittest.mock`, JavaScript uses Vitest `vi` module

**Python Mocking:**

```python
from unittest.mock import patch, MagicMock, AsyncMock

# Patch external service
@patch('services.gemini_service.genai.aio.ClientAsync')
def test_extract_with_mock(mock_genai):
    mock_response = MagicMock()
    mock_response.text = '{"produits": []}'
    mock_genai.return_value.generate_content.return_value = mock_response
    # ... test code
```

**Patterns:**
- Use `@patch()` decorator for dependencies
- Create `MagicMock()` objects for service responses
- Use `AsyncMock()` for async dependencies
- Reset mocks between tests via fixtures

**JavaScript Mocking:**

```javascript
import { vi } from 'vitest'

const handleClick = vi.fn()
render(<Button onClick={handleClick}>Click</Button>)
expect(handleClick).toHaveBeenCalled()

// Mock module
vi.mock('@/shared/lib/apiClient', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { ... } })
  }
}))
```

**Patterns:**
- Use `vi.fn()` to create spy functions
- Use `vi.mock()` to replace modules
- Mock API responses: `mockResolvedValue()` for async
- Reset via setup/teardown or `vi.clearAllMocks()`

**What to Mock:**
- External APIs (Gemini, Storj, databases)
- HTTP calls (use mocked `apiClient`)
- Browser APIs (localStorage, matchMedia — see `setup.js`)
- File system operations

**What NOT to Mock:**
- Core business logic (hash algorithms, validators)
- Zustand store state management (test real state)
- React hooks (except where unavoidable)
- Date/time unless testing time-dependent behavior

## Fixtures and Factories

**Python Test Fixtures:**

Located in `apps/api/tests/conftest.py`:

```python
@pytest.fixture
def authenticated_client():
    """Returns (httpx.Client, user_dict) authenticated with token."""
    # Register user, login, get client with auth headers
    return client, user

@pytest.fixture
def unique_user():
    """Returns dict with unique email for each test."""
    return {
        "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
        "password": "SecurePass123!",
        "name": "Test User"
    }
```

**Usage:**
- Fixtures injected as function parameters
- Async fixtures support: `@pytest.fixture` + `async def`
- Scope control: `@pytest.fixture(scope="session")` for one-time setup

**JavaScript Test Fixtures:**

Located in `src/__tests__/setup.js`:

```javascript
// Mock localStorage globally
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
```

**Patterns:**
- Setup file runs before all tests (specified in `vite.config.js`)
- Mock browser globals (localStorage, matchMedia, fetch if needed)
- Create reusable fixtures or factories in test utilities

## Coverage

**Requirements:**
- Python: No hard requirement (configured in `pytest.ini` but not enforced)
- JavaScript: Thresholds set in `vite.config.js` (`lines: 60, functions: 60, branches: 60, statements: 60`)

**View Coverage:**

```bash
# Backend
pytest --cov=services --cov=core --cov-report=html

# Frontend
npm run test:coverage
# Opens coverage/index.html
```

**Configuration:**
- Python: `pytest-cov` plugin, reports to stdout and HTML
- JavaScript: v8 provider via Vitest, reports text/html/json/lcov

## Test Types

**Unit Tests:**

**Python:**
- Test single functions/methods in isolation
- No mocking of core logic, only external services
- Example: `test_hash_and_verify()` in `services/test_auth_service.py`
- Focus on business logic, edge cases, error states

**JavaScript:**
- Test components in isolation
- Mock API clients, pass in test data
- Example: `Button.test.jsx` tests variants, disabled state, click handlers
- Verify rendered output and user interactions

**Integration Tests:**

**Python:**
- Database integration: `tests/integration/test_database.py`
- Storage integration: `tests/integration/test_storage.py`
- Real asyncpg connections, real schema
- Test queries, transactions, error recovery

**JavaScript:**
- Feature-level: `src/features/*/\_\_tests\_\_/` tests
- Test multiple components together
- Mock API layer but integrate UI logic
- Example: `CataloguePage.test.jsx` renders page, searches, edits

**E2E Tests:**

**Python:**
- Located in `tests/e2e/`
- Use Playwright for browser automation (optional, configured in `pyproject.toml`)
- Example: `test_scan_flow.py` — full upload → validation → catalogue flow
- Not run in CI/CD by default (slow)

**JavaScript:**
- Not implemented yet (identified as gap in CONCERNS.md)
- Would use Vitest + Playwright or Cypress
- Future: test complete user workflows end-to-end

**Performance Tests:**

**Python:**
- Located in `tests/performance/`
- Example: `test_response_times.py` — measure endpoint latency
- Use timers, assertions on thresholds
- Marked with `@pytest.mark.performance`

**Security Tests:**

**Python:**
- Located in `tests/security/`
- `test_auth_bypass.py` — verify token validation
- `test_injection.py` — SQL injection, command injection
- `test_headers.py` — CORS, content-type, etc.
- `test_isolation.py` — user data isolation (no cross-user access)
- `test_safe_helpers.py` — helper function safety (escaping, hashing)

## Common Patterns

**Error Testing:**

**Python:**

```python
def test_register_duplicate_email_409(ensure_server_running: str, unique_user: dict):
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    # First registration succeeds
    client.post("/api/v1/auth/register", data={...})
    # Second with same email fails
    resp = client.post("/api/v1/auth/register", data={...})
    assert resp.status_code == 409
    detail = resp.json().get("detail", "").lower()
    assert "utilise" in detail or "deja" in detail
```

**Patterns:**
- Test specific HTTP status codes (401, 409, 422)
- Verify error message content (multilingue: check FR/ES/CA)
- Use fixtures to setup test data consistently

**JavaScript:**

```javascript
it('does not call onClick when disabled', async () => {
  const user = userEvent.setup()
  const handleClick = vi.fn()
  render(
    <Button disabled onClick={handleClick}>
      Disabled
    </Button>
  )

  await user.click(screen.getByText('Disabled'))
  expect(handleClick).not.toHaveBeenCalled()
})
```

**Patterns:**
- Test disabled/loading states prevent actions
- Use mocks to verify handlers not called
- Test accessibility (aria labels, roles)

## Markers and Categories

**Python Pytest Markers:** (defined in `pyproject.toml`)

```ini
[tool.pytest.ini_options]
markers = [
    "slow: tests > 5 secondes",
    "security: tests de sécurité",
    "e2e: tests end-to-end (Playwright)",
    "performance: tests de performance",
    "external: tests avec services externes (Gemini, Storj)",
]
```

**Usage:**
```bash
pytest -m security          # Run security tests only
pytest -m "not external"    # Skip external service tests
pytest -m "slow or e2e"     # Run slow or E2E
```

**Test Timeouts:**
- Default: 30 seconds (set in `pytest.ini`)
- Use `@pytest.mark.timeout(120)` for longer-running tests
- External service tests timeout at 180+ seconds (Gemini extraction is slow)

## Test Data & Fixtures

**Backend Test Data:**
- 134 real BigMat invoices in `PDF Test/` directory (not tracked in git)
- Use for real extraction testing (marked `@pytest.mark.external`)
- Faker for synthetic data: `faker>=30` generates realistic invoice fields

**Frontend Test Data:**
- Vitest auto-mocks API responses in `src/__tests__/setup.js`
- Zustand store initialized fresh per test
- Use realistic product objects in mock data

---

*Testing analysis: 2026-03-17*
