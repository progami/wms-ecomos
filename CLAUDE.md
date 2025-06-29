# Claude Code MCP Server Configuration

## MCP Server Status (Fixed: 2025-06-29)

### Working Servers (All 9 servers now functional) 
- **memory** - Knowledge Graph server ✓
- **playwright** - Browser automation ✓
- **context7** - Documentation context ✓
- **serena** - Python-based MCP server ✓
- **filesystem** - File system access (fixed: added /Users/jarraramjad argument) ✓
- **git** - Git repository operations ✓
- **fetch** - HTTP fetch operations ✓
- **github** - GitHub API integration ✓
- **time** - Time operations with Chicago timezone ✓

### Fixed Issues

#### Filesystem Server Missing Arguments
**Problem**: The filesystem server was failing because it requires directory arguments
**Solution**: Added home directory as argument:
```json
"filesystem": {
  "type": "stdio",
  "command": "/opt/homebrew/bin/npx -y @modelcontextprotocol/server-filesystem",
  "args": ["/Users/jarraramjad"],
  "env": {}
}
```

#### Google Workspace Server Directory Not Found
**Problem**: The google-workspace server path `/Users/jarraramjad/mcp-servers/google_workspace` doesn't exist
**Solution**: Removed this server from configuration until the directory is created

#### Time Server Already Fixed
**Previous fix still working**: Timezone parameter correctly set to America/Chicago

## Configuration Location
- **Main config**: `~/.claude.json`
- **Backup created**: `~/.claude.json.backup`

## Restart Required
After configuration changes, restart Claude Code for the changes to take effect.

## Debugging MCP Servers
1. Use `/mcp` command to check server status
2. Test servers directly: `echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}' | <server-command>`
3. Check for timezone issues (use IANA format like America/Chicago)
4. Verify API tokens and environment variables