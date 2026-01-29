import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 pb-8">
      <div className="max-w-2xl mx-auto p-4 pt-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-6">
          Privacy Policy
        </h1>

        <div className="prose prose-sm dark:prose-invert space-y-4 text-muted-foreground">
          <p className="text-sm">Last updated: January 29, 2025</p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">1. Introduction</h2>
            <p>
              Welcome to Cycle Charm ("we," "our," or "us"). We are committed to protecting your
              personal information and your right to privacy. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you use our mobile
              application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">2. Information We Collect</h2>
            <p>We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Account Information:</strong> Display name, email address, and age</li>
              <li><strong>Health Data:</strong> Menstrual cycle dates, period length, symptoms, mood, energy levels, and sleep quality</li>
              <li><strong>Usage Data:</strong> How you interact with the app, features used, and preferences</li>
              <li><strong>Device Information:</strong> Device type, operating system, and app version</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Provide personalized cycle predictions and insights</li>
              <li>Send you reminders and notifications about your cycle</li>
              <li>Improve and optimize our app</li>
              <li>Provide customer support</li>
              <li>Ensure app security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">4. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect
              your personal information. Your health data is encrypted both in transit and at rest.
              We use industry-standard security protocols and regularly update our security practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">5. Data Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal health information to third parties.
              We may share anonymized, aggregated data for research purposes. We may share data
              with service providers who assist in operating our app, subject to strict
              confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and all associated data</li>
              <li>Export your data</li>
              <li>Opt-out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">7. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as
              needed to provide you services. You can request deletion of your account at any
              time through the app settings, and we will delete your data within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">8. Children's Privacy</h2>
            <p>
              Our app is not intended for children under 13 years of age. We do not knowingly
              collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new Privacy Policy on this page and updating the "Last
              updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Email:</strong> privacy@cyclecharm.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
