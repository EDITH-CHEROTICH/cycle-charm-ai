import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
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
          Terms of Service
        </h1>

        <div className="prose prose-sm dark:prose-invert space-y-4 text-muted-foreground">
          <p className="text-sm">Last updated: January 29, 2025</p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">1. Acceptance of Terms</h2>
            <p>
              By downloading, installing, or using Cycle Charm ("the App"), you agree to be bound
              by these Terms of Service. If you do not agree to these terms, please do not use
              the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">2. Description of Service</h2>
            <p>
              Cycle Charm is a menstrual cycle tracking application that provides cycle predictions,
              symptom tracking, health insights, and personalized recommendations. The App is
              designed for informational purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">3. Medical Disclaimer</h2>
            <p>
              <strong>IMPORTANT:</strong> Cycle Charm is NOT a medical device or diagnostic tool.
              The predictions and insights provided are estimates based on the data you enter and
              should not be used as:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>A method of birth control or contraception</li>
              <li>Medical advice or diagnosis</li>
              <li>A substitute for professional medical consultation</li>
            </ul>
            <p className="mt-2">
              Always consult with a qualified healthcare provider for medical advice and before
              making any health-related decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">4. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activities that occur under your account. You must provide accurate
              information and keep it updated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">5. Subscription and Payments</h2>
            <p>
              Some features of Cycle Charm require a premium subscription. By subscribing:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>You authorize us to charge your payment method on a recurring basis</li>
              <li>Subscriptions auto-renew unless cancelled before the renewal date</li>
              <li>Refunds are subject to the app store policies (Google Play or Apple App Store)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">6. User Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Use the App for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the App's functionality</li>
              <li>Share your account with others</li>
              <li>Reverse engineer or attempt to extract the source code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">7. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the App are owned by Cycle Charm and
              are protected by copyright, trademark, and other intellectual property laws. You
              may not copy, modify, or distribute any part of the App without our permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Cycle Charm shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, or any loss of
              profits or revenues, whether incurred directly or indirectly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">9. Account Termination</h2>
            <p>
              You may delete your account at any time through the app settings. We reserve the
              right to suspend or terminate your account if you violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">10. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of significant
              changes through the App. Your continued use of the App after changes constitutes
              acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">11. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws,
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">12. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Email:</strong> support@cyclecharm.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
