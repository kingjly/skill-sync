import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, FileText, FolderOpen, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import type { Skill } from '../lib/api';

export default function Skills() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const { data: skillsResponse, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: api.skills.list,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.skills.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setShowCreate(false);
      setNewSkillName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.skills.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setSelectedSkill(null);
    },
  });

  const skills = skillsResponse?.data || [];

  const handleCreate = () => {
    if (newSkillName.trim()) {
      createMutation.mutate(newSkillName.trim());
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Skills</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">
            Manage your AI coding assistant skills
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn btn-primary btn-md flex items-center gap-2"
        >
          <Plus size={18} />
          New Skill
        </button>
      </div>

      {showCreate && (
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Create New Skill</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="Skill name"
              className="input flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={!newSkillName.trim() || createMutation.isPending}
              className="btn btn-primary btn-md"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewSkillName('');
              }}
              className="btn btn-secondary btn-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="card">
            <div className="p-3 border-b">
              <h3 className="font-semibold">All Skills ({skills.length})</h3>
            </div>
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {skills.length === 0 ? (
                <div className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No skills yet. Create your first skill!
                </div>
              ) : (
                skills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => setSelectedSkill(skill)}
                    className={`w-full p-3 text-left hover:bg-[hsl(var(--muted))] transition-colors ${
                      selectedSkill?.id === skill.id ? 'bg-[hsl(var(--muted))]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[hsl(var(--muted-foreground))]" />
                        <span className="font-medium">{skill.name}</span>
                      </div>
                      <ChevronRight size={16} className="text-[hsl(var(--muted-foreground))]" />
                    </div>
                    {skill.description && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 truncate">
                        {skill.description}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedSkill ? (
            <div className="card">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedSkill.name}</h3>
                  {selectedSkill.description && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                      {selectedSkill.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Delete skill "${selectedSkill.name}"?`)) {
                      deleteMutation.mutate(selectedSkill.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="btn btn-ghost btn-sm text-red-600 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedSkill.tags.map((tag) => (
                    <span key={tag} className="badge badge-secondary">
                      {tag}
                    </span>
                  ))}
                </div>

                <h4 className="text-sm font-semibold mb-2">Files ({selectedSkill.files.length})</h4>
                <div className="space-y-1">
                  {selectedSkill.files.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center justify-between p-2 rounded bg-[hsl(var(--muted))] text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-[hsl(var(--muted-foreground))]" />
                        <span>{file.path}</span>
                      </div>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">
                  <p>Created: {new Date(selectedSkill.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedSkill.updatedAt).toLocaleString()}</p>
                  {selectedSkill.sourceTool && <p>Source: {selectedSkill.sourceTool}</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--muted-foreground))] opacity-50" />
              <p className="text-[hsl(var(--muted-foreground))]">
                Select a skill to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
