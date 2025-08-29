# Contributing to WhatsApp SDK

We love your input! We want to make contributing to WhatsApp SDK as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## We Develop with GitHub

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## We Use [GitHub Flow](https://guides.github.com/introduction/flow/index.html)

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using GitHub's [issue tracker](https://github.com/joseandrespena/whatsapp-sdk/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/joseandrespena/whatsapp-sdk/issues/new); it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

People *love* thorough bug reports. I'm not even kidding.

## Development Process

1. **Clone the repository**
   ```bash
   git clone https://github.com/joseandrespena/whatsapp-sdk.git
   cd whatsapp-sdk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Run linting**
   ```bash
   npm run lint
   ```

## Coding Style

- We use TypeScript for type safety
- We use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Follow the existing code patterns
- Add JSDoc comments for public APIs
- Write tests for new functionality

### Code Style Guidelines

- Use meaningful variable and function names
- Keep functions small and focused
- Use async/await instead of Promises where possible
- Handle errors appropriately
- Add proper TypeScript types

## Testing

- Write unit tests for all new functionality
- Ensure existing tests continue to pass
- Aim for good test coverage
- Use descriptive test names

## Documentation

- Update README.md if you change functionality
- Add JSDoc comments for new public methods
- Update examples if APIs change
- Keep documentation clear and concise

## Feature Requests

We welcome feature requests! Before submitting:

1. Check if the feature already exists
2. Search existing issues to see if it's already been requested
3. Consider if it fits the scope of the project
4. Provide detailed use cases

## Pull Request Process

1. Update the README.md with details of changes to the interface, if applicable
2. Update the package.json version following [Semantic Versioning](http://semver.org/)
3. The PR will be merged once you have the sign-off of at least one maintainer

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Don't hesitate to ask questions by opening an issue or contacting the maintainers directly.