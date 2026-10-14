# Local security model

Skill Blueprint Studio is a local application. The server binds to `127.0.0.1`; it is not an authenticated multi-user or internet service. All browser sessions connected to that server share its workspace. Other local processes with filesystem or server access may access the data.

Database writes require JSON, a local host, and an allowed browser origin when supplied. Cross-site requests are rejected. Revision checks reject stale saves. These checks protect local browser workflows; they do not provide user authentication or authorization.

The working database belongs outside the static web root. Database files are excluded from static serving and from Git. Original assets and review records can contain sensitive data, so protect the data folder and downloaded backups with the operating system's access controls. Publishing application source does not publish working project data.

Imported skill files are untrusted input. Source analysis parses Python, HTML, and structural assets as data; it does not execute imported programs. Normal export retains structural checks and the separate adversarial-review requirement. Reviewer identities in this local application are declared rather than authenticated.

Do not expose this server externally without adding authentication, authorization, transport security, request controls, and an appropriate shared-data architecture. Separate machines use separate local databases unless data is explicitly transferred.

Report a suspected issue without including credentials, private skills, or database contents. Public reproduction steps should use generic synthetic data.
