export interface Project {
  uuid: string;
  name: string;
  description?: string;
}

export interface App {
  uuid: string;
  name: string;
  fqdn?: string;
  git_repository?: string;
  git_branch?: string;
  status?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface EnvVar {
  id: number;
  uuid: string;
  key: string;
  value: string;
  is_preview?: boolean;
  is_literal?: boolean;
  is_multiline?: boolean;
  is_shown_once?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Deployment {
  id: number;
  uuid: string;
  status: string;
  created_at: string;
  updated_at?: string;
  commit_message?: string;
  commit_sha?: string;
  [key: string]: unknown;
}

export type DetailTab = "deployments" | "logs" | "domains" | "envs" | "settings";
