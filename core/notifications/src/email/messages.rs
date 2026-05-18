/// A rendered email ready for delivery.
#[derive(Debug, Clone)]
pub struct EmailMessage {
    pub to: String,
    pub from: String,
    pub subject: String,
    pub html: String,
    pub text: String,
}

pub struct PasswordResetEmail<'a> {
    pub to: &'a str,
    pub reset_url: &'a str,
    pub app_name: &'a str,
}

impl<'a> PasswordResetEmail<'a> {
    pub fn render(self, from: String) -> EmailMessage {
        let Self {
            to,
            reset_url,
            app_name,
        } = self;
        let subject = format!("Reset your {app_name} password");
        let text = format!(
            "We received a request to reset your {app_name} password.\n\n\
             Open this link in a browser to choose a new password:\n{reset_url}\n\n\
             If you did not request this, you can safely ignore this email.\n\
             The link expires in 1 hour.\n"
        );
        let html = format!(
            r#"<!doctype html>
<html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
<h1 style="font-size:20px;margin:0 0 16px">Reset your {app_name} password</h1>
<p>We received a request to reset your {app_name} password. Click the button below to choose a new one.</p>
<p style="margin:24px 0">
  <a href="{reset_url}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Reset password</a>
</p>
<p style="color:#555;font-size:13px">Or paste this URL into your browser:<br><span style="word-break:break-all">{reset_url}</span></p>
<p style="color:#555;font-size:13px">If you did not request this, you can safely ignore this email. The link expires in 1 hour.</p>
</body></html>"#
        );

        EmailMessage {
            to: to.to_string(),
            from,
            subject,
            html,
            text,
        }
    }
}

pub struct AdminInvitationEmail<'a> {
    pub to: &'a str,
    pub inviter_email: &'a str,
    pub website_name: &'a str,
    pub accept_url: &'a str,
    pub app_name: &'a str,
}

impl<'a> AdminInvitationEmail<'a> {
    pub fn render(self, from: String) -> EmailMessage {
        let Self {
            to,
            inviter_email,
            website_name,
            accept_url,
            app_name,
        } = self;
        let subject = format!("{inviter_email} invited you to {website_name} on {app_name}");
        let text = format!(
            "{inviter_email} invited you to collaborate on \"{website_name}\" on {app_name}.\n\n\
             Accept the invitation:\n{accept_url}\n\n\
             If you weren't expecting this, you can safely ignore this email.\n"
        );
        let html = format!(
            r#"<!doctype html>
<html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
<h1 style="font-size:20px;margin:0 0 16px">You've been invited</h1>
<p><strong>{inviter_email}</strong> invited you to collaborate on <strong>{website_name}</strong> on {app_name}.</p>
<p style="margin:24px 0">
  <a href="{accept_url}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Accept invitation</a>
</p>
<p style="color:#555;font-size:13px">Or paste this URL into your browser:<br><span style="word-break:break-all">{accept_url}</span></p>
<p style="color:#555;font-size:13px">If you weren't expecting this, you can safely ignore this email.</p>
</body></html>"#
        );

        EmailMessage {
            to: to.to_string(),
            from,
            subject,
            html,
            text,
        }
    }
}
