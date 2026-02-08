import { useNavigate } from "@solidjs/router";
import { t } from "@shared/i18n";

export default function MobilePrivacy() {
  const navigate = useNavigate();
  return (
    <div class="px-4 py-6 text-[#e6edf3] pb-24">
      <button type="button" class="text-sm text-[#8b949e] hover:text-[#00f0ff] mb-4" onClick={() => navigate(-1)}>{t("common.back")}</button>

      <h1 class="text-2xl font-bold mb-1">{t("privacy.title")}</h1>
      <p class="text-[#8b949e] text-xs mb-6">{t("privacy.updated")}</p>

      <section class="space-y-5 text-[#8b949e] text-sm leading-relaxed">
        <div>
          <h2 class="text-base font-semibold text-[#e6edf3] mb-2">{t("privacy.collect.title")}</h2>
          <p>{t("privacy.collect.intro")}</p>
          <ul class="list-disc list-inside space-y-1 mt-1">
            <li>{t("privacy.collect.li1")}</li>
            <li>{t("privacy.collect.li2")}</li>
            <li>{t("privacy.collect.li3")}</li>
          </ul>
          <p class="mt-2 text-[#00f0ff] text-xs font-medium">{t("privacy.collect.note")}</p>
        </div>

        <div>
          <h2 class="text-base font-semibold text-[#e6edf3] mb-2">{t("privacy.use.title")}</h2>
          <ul class="list-disc list-inside space-y-1">
            <li>{t("privacy.use.li1")}</li>
            <li>{t("privacy.use.li2")}</li>
            <li>{t("privacy.use.li3")}</li>
            <li>{t("privacy.use.li4")}</li>
            <li>{t("privacy.use.li5")}</li>
          </ul>
        </div>

        <div>
          <h2 class="text-base font-semibold text-[#e6edf3] mb-2">{t("privacy.security.title")}</h2>
          <ul class="list-disc list-inside space-y-1">
            <li>{t("privacy.security.li1")}</li>
            <li>{t("privacy.security.li2")}</li>
            <li>{t("privacy.security.li3")}</li>
            <li>{t("privacy.security.li4")}</li>
          </ul>
        </div>

        <div>
          <h2 class="text-base font-semibold text-[#e6edf3] mb-2">{t("privacy.sharing.title")}</h2>
          <p>{t("privacy.sharing.intro")}</p>
          <ul class="list-disc list-inside space-y-1 mt-1">
            <li>{t("privacy.sharing.li1")}</li>
            <li>{t("privacy.sharing.li2")}</li>
            <li>{t("privacy.sharing.li3")}</li>
          </ul>
        </div>

        <div>
          <h2 class="text-base font-semibold text-[#e6edf3] mb-2">{t("privacy.cookie.title")}</h2>
          <p>{t("privacy.cookie.text")}</p>
        </div>

        <div>
          <h2 class="text-base font-semibold text-[#e6edf3] mb-2">{t("privacy.rights.title")}</h2>
          <ul class="list-disc list-inside space-y-1">
            <li>{t("privacy.rights.li1")}</li>
            <li>{t("privacy.rights.li2")}</li>
            <li>{t("privacy.rights.li3")}</li>
            <li>{t("privacy.rights.li4")}</li>
          </ul>
        </div>

        <div>
          <h2 class="text-base font-semibold text-[#e6edf3] mb-2">{t("privacy.contact.title")}</h2>
          <p>{t("privacy.contact.email")}</p>
          <p>{t("privacy.contact.address")}</p>
        </div>
      </section>
    </div>
  );
}
