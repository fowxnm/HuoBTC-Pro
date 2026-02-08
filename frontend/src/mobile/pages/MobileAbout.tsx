import { useNavigate } from "@solidjs/router";
import { t } from "@shared/i18n";

export default function MobileAbout() {
  const navigate = useNavigate();
  return (
    <div class="px-4 py-6 text-[#e6edf3] pb-24">
      <button type="button" class="text-sm text-[#8b949e] hover:text-[#00f0ff] mb-4" onClick={() => navigate(-1)}>{t("common.back")}</button>

      <h1 class="text-2xl font-bold mb-6">{t("about.title")}</h1>

      <section class="space-y-5 text-[#8b949e] text-sm leading-relaxed">
        <div>
          <p>{t("about.intro")}</p>
        </div>

        <div>
          <h2 class="text-base font-semibold text-[#e6edf3] mb-2">{t("about.mission.title")}</h2>
          <p>{t("about.mission.text")}</p>
        </div>

        <div>
          <h2 class="text-base font-semibold text-[#e6edf3] mb-2">{t("about.advantages.title")}</h2>
          <ul class="list-disc list-inside space-y-1">
            <li>{t("about.adv.security")}</li>
            <li>{t("about.adv.compliance")}</li>
            <li>{t("about.adv.speed")}</li>
            <li>{t("about.adv.global")}</li>
            <li>{t("about.adv.support")}</li>
          </ul>
        </div>

        <div>
          <h2 class="text-base font-semibold text-[#e6edf3] mb-2">{t("about.contact.title")}</h2>
          <p>1500 N Grant St, Boulder, CO 80302, USA</p>
          <p>support@huobtc.com</p>
        </div>
      </section>
    </div>
  );
}
