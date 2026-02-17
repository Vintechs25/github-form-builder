import GitHubDeployments from "@/components/dashboard/GitHubDeployments";

const Applications = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-xl">Applications</h1>
        <p className="text-sm text-muted-foreground">Deploy and manage your applications from Git repositories</p>
      </div>
      <GitHubDeployments />
    </div>
  );
};

export default Applications;
