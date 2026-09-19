# Mandatory Full Backup Policy

Before executing any major project modifications, structural refactoring, complex database migrations, or version rollbacks:
1. The AI Agent MUST take a FULL project backup archive into the `Versions/` directory using:
   `git archive -o "Versions/YYYY-MM-DD_v<VERSION>_<DescriptiveName>.zip" HEAD`
2. The agent MUST verify the archive was successfully generated and is non-empty before modifying any source code.
3. Keep all full project backups preserved and never delete historical snapshots in `Versions/`.
