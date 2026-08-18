# Security

This project is a **local-first** scoring tool. The default deployment is your
laptop: FastAPI on `localhost:8000`, Next.js on `localhost:3000`, Ollama on
`localhost:11434`. There is no authentication.

## Do not expose the API

If you bind the API to a public interface, anyone who can reach it can:

- upload arbitrary PDFs
- trigger LLM inference (cost / DoS on the host)
- trigger GitHub API calls with your `GITHUB_TOKEN` if set
- spend a pasted cloud key for that request

Keep it on loopback, or put it behind your own auth.

## Data

CVs and extracted resumes stay on the machine running the pipeline when the
runtime is local Ollama. A cloud runtime (Gemini or Ollama Cloud) sends the
extracted resume to that provider for the duration of the evaluation.

Do not commit CVs, `.env`, or evaluation JSON/HTML reports.

## Bring-your-own-key

Wizard step 03 accepts a Gemini or Ollama Cloud key as a password field for
**that run only**. The UI never writes it to `localStorage`, cookies, `.env`,
or disk. The API receives it as a multipart form field, uses it for outbound
LLM calls, and drops it when the request ends.

- Never in storage
- Never in env (the paste path; `GEMINI_API_KEY` / `OLLAMA_API_KEY` exist only
  as a CLI convenience you set yourself)
- Never in logs (errors that would have included the key are redacted)
- Never in SSE

Callers cannot supply a custom base URL. Cloud hosts are a fixed catalog.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on this repository.

Do not open a public issue for a vulnerability.

Include: affected version / commit, a minimal reproduction, and impact. We will
acknowledge within a few days and ship a fix or a documented mitigation before
any disclosure.
