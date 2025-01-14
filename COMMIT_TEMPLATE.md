# Commit Templates

A reference guide for writing consistent commit messages. This template ensures proper documentation of changes across the project.

## Format

```
<type>(<scope>): brief description

detailed description if needed

ticket numbers if applicable
```

Example:
```
fix(websocket): resolve reconnection issues

- Add error handling
- Increase timeout to 3 seconds
- Fix connection cleanup

Closes #123
```

## Change Types

- `feat`: new feature (websockets, authentication, etc.)
- `fix`: bug fix
- `docs`: documentation updates
- `style`: formatting, missing semicolons, etc.
- `refactor`: code changes that maintain same functionality
- `test`: adding or updating tests
- `chore`: dependency updates or config changes

## Change Scopes

- `websocket`: WebSocket-related changes
- `chat`: chat functionality
- `auth`: authentication and sessions
- `ui`: frontend changes
- `db`: database changes
- `api`: backend endpoints
- `config`: configuration and settings

## Examples

```
feat(chat): implement typing indicator

Show when a user is typing a message:
- Add status transmission via WebSocket
- Implement debounce to prevent spam
- Add loading indicator

Closes #456
```

```
fix(auth): resolve expired session handling

- Add automatic token refresh
- Fix cookie cleanup on logout
- Remove localStorage workaround

Fixes #789
```

```
fix(chat): resolve message ordering issue

- Fix timestamp comparison
- Update message sorting logic
- Add proper error handling

Fixes #456
```

```
docs(websocket): update WebSocket implementation details

- Add connection flow diagram
- Document reconnection strategy
- Update API documentation

Related to #789
```

## Best Practices

1. Keep the subject line under 50 characters
2. Use imperative mood in subject line
3. Capitalize the subject line
4. Don't end the subject line with a period
5. Separate subject from body with a blank line
6. Wrap the body at 72 characters
7. Use the body to explain what and why vs. how
8. Reference issues and pull requests when relevant

This template helps maintain a clean and informative git history while highlighting the WebSocket implementation and other key features of the project.