# Contributing to HealthMate

Thank you for contributing to HealthMate! This document provides guidelines for contributing to the project.

## Branch Workflow

### Branch Naming Convention

```bash
feature/[feature-name]    # New features
fix/[bug-name]            # Bug fixes
docs/[doc-name]           # Documentation updates
test/[test-name]          # Test additions
refactor/[refactor-name]  # Code refactoring
```

### Example Branch Names

- `feature/patient-registration`
- `fix/booking-conflict-detection`
- `docs/api-documentation`
- `test/appointment-service`

## Commit Message Guidelines

### Format

```
[type]: [short description]

[optional detailed explanation]

Fixes #[issue-number]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat: add patient registration form

- Create signup form component with validation
- Implement password hashing with bcrypt
- Add email verification workflow

Fixes #12
```

```bash
fix: resolve double booking conflict

- Add database-level unique constraint
- Implement optimistic locking
- Add conflict detection in booking service

Fixes #45
```

## Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, well-documented code
   - Follow existing code style and patterns
   - Add unit tests for new features
   - Update documentation as needed

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

4. **Push Branch**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Go to GitHub repository
   - Click "New Pull Request"
   - Select `develop` as base branch
   - Select your feature branch as compare branch
   - Fill out PR template with details
   - Request review from team member

6. **Code Review**
   - Address reviewer feedback
   - Push additional commits if needed
   - Ensure all CI checks pass

7. **Merge**
   - After approval, merge PR to `develop`
   - Delete feature branch after merge

## Code Style Guidelines

### JavaScript/React

- Use ES6+ syntax
- Use functional components with hooks
- Follow Airbnb JavaScript Style Guide
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

### Example

```javascript
/**
 * Books an appointment for a patient
 * @param {Object} appointmentData - Appointment details
 * @param {string} appointmentData.patientId - Patient ID
 * @param {string} appointmentData.doctorId - Doctor ID
 * @param {Date} appointmentData.dateTime - Appointment date and time
 * @returns {Promise<Object>} Created appointment object
 */
async function bookAppointment(appointmentData) {
  // Implementation
}
```

## Testing Guidelines

- Write unit tests for all new features
- Maintain minimum 80% code coverage
- Test edge cases and error scenarios
- Use descriptive test names

### Example Test

```javascript
describe('Appointment Booking Service', () => {
  it('should create appointment when slot is available', async () => {
    // Test implementation
  });

  it('should throw error when slot is already booked', async () => {
    // Test implementation
  });
});
```

## Documentation

- Update README.md for user-facing changes
- Update API.md for API changes
- Add inline comments for complex logic
- Keep documentation in sync with code

## Issue Reporting

- Use GitHub Issues for bug reports and feature requests
- Fill out issue templates completely
- Include reproduction steps for bugs
- Add relevant labels to issues

## Questions?

If you have questions about contributing, please reach out to the team lead or post in the team communication channel.

Thank you for contributing to HealthMate! 🏥