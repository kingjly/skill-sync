import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Terminal, Monitor, Code, Puzzle, Check, X, RefreshCw, Download } from 'lucide-react';
import { api } from '../lib/api';
import type { Tool, SyncResult } from '../lib/api';

const categoryIcons = {
  cli: Terminal,
  ide: Monitor,
  vscode: Code,
  jetbrains: Puzzle,
};

export default function Tools() {
  const queryClient = useQueryClient();
  const [syncingTools, setSyncingTools] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<Map<string, SyncResult[]>>(new Map());

  const { data: toolsResponse, isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: api.tools.list,
  });

  const syncAllMutation = useMutation({
    mutationFn: () => api.sync.syncAll(),
    onSuccess: (response) => {
      if (response.data) {
        const resultsByTool = new Map<string, SyncResult[]>();
        for (const result of response.data) {
          const existing = resultsByTool.get(result.toolId) || [];
          existing.push(result);
          resultsByTool.set(result.toolId, existing);
        }
        setSyncResults(resultsByTool);
      }
      queryClient.invalidateQueries({ queryKey: ['sync'] });
    },
  });

  const syncToolMutation = useMutation({
    mutationFn: (toolId: string) => api.sync.syncAllToTool(toolId),
    onMutate: (toolId) => {
      setSyncingTools((prev) => new Set(prev).add(toolId));
    },
    onSettled: (_, __, toolId) => {
      setSyncingTools((prev) => {
        const next = new Set(prev);
        next.delete(toolId);
        return next;
      });
    },
    onSuccess: (response, toolId) => {
      if (response.data) {
        setSyncResults((prev) => {
          const next = new Map(prev);
          next.set(toolId, response.data!);
          return next;
        });
      }
      queryClient.invalidateQueries({ queryKey: ['sync'] });
    },
  });

  const tools = toolsResponse?.data || [];

  const groupedTools = tools.reduce(
    (acc, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category]!.push(tool);
      return acc;
    },
    {} as Record<string, Tool[]>
  );

  const categoryLabels: Record<string, string> = {
    cli: 'CLI Tools',
    ide: 'IDE',
    vscode: 'VS Code Extensions',
    jetbrains: 'JetBrains Plugins',
  };

  const detectedTools = tools.filter((t) => t.detected);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tools</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">
            AI coding assistants detected on your system ({detectedTools.length}/{tools.length})
          </p>
        </div>
        <button
          onClick={() => syncAllMutation.mutate()}
          disabled={syncAllMutation.isPending}
          className="btn btn-primary btn-md flex items-center gap-2"
        >
          <RefreshCw size={18} className={syncAllMutation.isPending ? 'animate-spin' : ''} />
          {syncAllMutation.isPending ? 'Syncing...' : 'Sync All'}
        </button>
      </div>

      {syncAllMutation.isSuccess && syncAllMutation.data?.message && (
        <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
          {syncAllMutation.data.message}
        </div>
      )}

      {syncAllMutation.isError && (
        <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
          Failed to sync: {syncAllMutation.error?.message || 'Unknown error'}
        </div>
      )}

      {Object.entries(groupedTools).map(([category, categoryTools]) => {
        const Icon = categoryIcons[category as keyof typeof categoryIcons] || Puzzle;
        return (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              <h2 className="text-xl font-semibold">{categoryLabels[category] || category}</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryTools.map((tool) => {
                const isSyncing = syncingTools.has(tool.id);
                const toolResults = syncResults.get(tool.id);
                const successCount = toolResults?.filter((r) => r.success).length || 0;
                const failCount = toolResults?.filter((r) => !r.success).length || 0;

                return (
                  <div key={tool.id} className="card p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{tool.displayName}</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                          {tool.skillPath}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {tool.detected ? (
                          <span className="badge badge-success flex items-center gap-1">
                            <Check size={12} /> Detected
                          </span>
                        ) : (
                          <span className="badge badge-secondary flex items-center gap-1">
                            <X size={12} /> Not Found
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {tool.installed ? 'Skills directory exists' : 'No skills directory'}
                      </span>
                      {tool.detected && (
                        <button
                          onClick={() => syncToolMutation.mutate(tool.id)}
                          disabled={isSyncing}
                          className="btn btn-primary btn-sm flex items-center gap-1"
                        >
                          {isSyncing ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <Download size={14} />
                              Sync
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {toolResults && toolResults.length > 0 && (
                      <div className="mt-3 pt-3 border-t text-xs">
                        {successCount > 0 && (
                          <span className="text-green-600 dark:text-green-400 mr-2">
                            ✓ {successCount} synced
                          </span>
                        )}
                        {failCount > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            ✗ {failCount} failed
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
