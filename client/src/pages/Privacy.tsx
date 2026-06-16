export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold" data-testid="text-privacy-title">
        Privacy Policy
      </h1>
      <p className="text-sm text-muted-foreground">
        Koheez.ai is an internal clinical decision support tool used by authorized
        AHF pharmacy staff. It processes protected health information (PHI) solely
        to support clinical decision-making and pharmacy operations.
      </p>
      <div className="space-y-3 text-sm">
        <p>
          <strong>Information we handle.</strong> The application processes patient
          clinical details entered by authorized staff to evaluate drug
          interactions, generate consultation notes, and support retention
          outreach. Access is restricted to provisioned users.
        </p>
        <p>
          <strong>Authentication.</strong> When used inside Microsoft Teams,
          sign-in uses your organization's Microsoft Entra identity. No additional
          personal information is collected beyond your work account email and
          name.
        </p>
        <p>
          <strong>Audit logging.</strong> Access to patient information is recorded
          (who, what, and when) for HIPAA compliance. These audit records do not
          contain patient health information.
        </p>
        <p>
          <strong>Contact.</strong> Questions about this policy should be directed
          to your AHF pharmacy administrator.
        </p>
      </div>
    </div>
  );
}
