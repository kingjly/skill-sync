import { useQuery } from '@tanstack/react-query';
import { Terminal, Monitor, Code, Puzzle, Check, X } from 'lucide-react';
import { api } from '../lib/api';
import type { Tool } from '../lib/api';

const categoryIcons = {
  cli: Terminal,
  ide: Monitor,
  vscode: Code,
  jetbrains: Puzzle,
};

export default function Tools() {
  const { data: toolsResponse, isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: api.tools.list,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tools</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">
          AI coding assistants detected on your system
        </p>
      </div>

      {Object.entries(groupedTools).map(([category, categoryTools]) => {
        const Icon = categoryIcons[category as keyof typeof categoryIcons] || Puzzle;
        return (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              <h2 className="text-xl font-semibold">{categoryLabels[category] || category}</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryTools.map((tool) => (
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
                      <button className="btn btn-primary btn-sm">Sync</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
