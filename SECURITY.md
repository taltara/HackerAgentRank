# Security

This project is a **local-first** scoring tool. The default deployment is your
laptop: FastAPI on `localhost:8000`, Next.js on `localhost:3000`, Ollama on
`localhost:11434`. There is no authentication.

## Do not expose the API

If you bind the API to a public interface, anyone who can reach it can:

- upload arbitrary PDFs
- trigger LLM inference (cost / DoS on the host)
- trigger GitHub API calls with your `GITHUB_TOKEN` if set

Keep it on loopback, or put it behind your own auth.

## Data

CVs and extracted resumes stay on the machine running the pipeline, plus whatever
the configured LLM provider retains. A local Ollama model does not send the CV
to a third party. A cloud model does.

Do not commit CVs, `.env`, or evaluation JSON/HTML reports.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on this repository.

Do not open a public issue for a vulnerability.

Include: affected version / commit, a minimal reproduction, and impact. We will
acknowledge within a few days and ship a fix or a documented mitigation before
any disclosure.
