import { Mail } from "lucide-react";

const EmailAccounts = () => (
  <div className="space-y-6">
    <div>
      <h1 className="font-display font-semibold text-lg">Email Accounts</h1>
      <p className="text-sm text-muted-foreground">Manage your domain email accounts</p>
    </div>
    <div className="bg-card rounded-xl border border-border p-12 text-center">
      <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="font-display font-semibold text-lg mb-2">Email Management</h3>
      <p className="text-muted-foreground">Email accounts are managed through your hosting control panel. Create emails once your hosting is active.</p>
    </div>
  </div>
);

export default EmailAccounts;
