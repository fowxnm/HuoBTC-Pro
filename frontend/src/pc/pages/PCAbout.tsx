import { useNavigate } from "@solidjs/router";
import { t } from "@shared/i18n";

export default function PCAbout() {
  const navigate = useNavigate();
  return (
    <div class="max-w-[900px] mx-auto px-6 py-12 text-[#e6edf3]">
      <button type="button" class="text-sm text-[#8b949e] hover:text-[#00f0ff] mb-6 transition-colors" onClick={() => navigate(-1)}>{t("common.back")}</button>

      <h1 class="text-3xl font-bold mb-8">{t("about.title")}</h1>

      <section class="space-y-6 text-[#8b949e] leading-relaxed">
        <div>
          <p>{t("about.intro")}</p>
        </div>

        <div>
          <h2 class="text-xl font-semibold text-[#e6edf3] mb-3">{t("about.mission.title")}</h2>
          <p>{t("about.mission.text")}</p>
        </div>

        <div>
          <h2 class="text-xl font-semibold text-[#e6edf3] mb-3">{t("about.advantages.title")}</h2>
          <ul class="list-disc list-inside space-y-2">
            <li>{t("about.adv.security")}</li>
            <li>{t("about.adv.compliance")}</li>
            <li>{t("about.adv.speed")}</li>
            <li>{t("about.adv.global")}</li>
            <li>{t("about.adv.support")}</li>
          </ul>
        </div>

        <div>
          <h2 class="text-xl font-semibold text-[#e6edf3] mb-3">{t("about.contact.title")}</h2>
          <div class="space-y-1">
            <p>1500 N Grant St, Boulder, Colorado 80302, USA</p>
            <p>support@huobtc.com</p>
          </div>
        </div>
      </section>
    </div>
  );
}
