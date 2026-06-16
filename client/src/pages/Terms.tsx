export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold" data-testid="text-terms-title">
        Terms of Use
      </h1>
      <p className="text-sm text-muted-foreground">
        Koheez.ai is provided for use by authorized AHF pharmacy staff only.
      </p>
      <div className="space-y-3 text-sm">
        <p>
          <strong>Authorized use.</strong> Access is limited to provisioned users
          for legitimate clinical and pharmacy operations. You are responsible for
          maintaining the confidentiality of any patient information you access.
        </p>
        <p>
          <strong>Clinical judgment.</strong> The application provides decision
          support only. It does not replace the professional judgment of a licensed
          pharmacist or clinician. Always verify recommendations against current
          guidelines and patient-specific factors.
        </p>
        <p>
          <strong>Acceptable use.</strong> Do not share credentials, export PHI to
          unauthorized systems, or use the application for any purpose other than
          its intended clinical function.
        </p>
        <p>
          <strong>Contact.</strong> Questions about these terms should be directed
          to your AHF pharmacy administrator.
        </p>
      </div>
    </div>
  );
}
