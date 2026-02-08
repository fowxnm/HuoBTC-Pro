import { useNavigate } from "@solidjs/router";
import { t } from "@shared/i18n";

export default function MobileMsb() {
  const navigate = useNavigate();
  return (
    <div class="px-4 py-6 text-[#e6edf3] pb-24">
      <button type="button" class="text-sm text-[#8b949e] hover:text-[#00f0ff] mb-4" onClick={() => navigate(-1)}>{t("common.back")}</button>

      <h1 class="text-2xl font-bold mb-6">{t("msb.title")}</h1>

      <section class="space-y-5 text-[#8b949e] text-sm leading-relaxed">
        <div class="p-4 rounded-xl border border-[#30363d] bg-[#161b22]">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-9 h-9 rounded-full bg-[#00f0ff]/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <p class="text-[#e6edf3] font-semibold text-sm">{t("msb.regNumber")}</p>
              <p class="text-[#00f0ff] text-base font-mono">31000319084787</p>
            </div>
          </div>
          <p class="text-xs">{t("msb.description")}</p>
        </div>

        <div>
          <h2 class="text-base font-semibold text-[#e6edf3] mb-2">{t("msb.what.title")}</h2>
          <p>{t("msb.what.text")}</p>
        </div>

        <div>
          <h2 class="text-base font-semibold text-[#e6edf3] mb-2">{t("msb.compliance.title")}</h2>
          <ul class="list-disc list-inside space-y-1">
            <li>AML (Anti-Money Laundering)</li>
            <li>KYC (Know Your Customer)</li>
            <li>SAR (Suspicious Activity Reports)</li>
            <li>Transaction Records & Audit Trail</li>
            <li>Regular Compliance Reviews</li>
          </ul>
        </div>

        <div>
          <h2 class="text-base font-semibold text-[#e6edf3] mb-2">{t("msb.info.title")}</h2>
          <div class="space-y-2">
            <div class="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
              <p class="text-xs text-[#8b949e]">{t("msb.info.name")}</p>
              <p class="text-[#e6edf3] text-sm font-medium">HuoBTC (AIMS subsidiary)</p>
            </div>
            <div class="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
              <p class="text-xs text-[#8b949e]">{t("msb.info.number")}</p>
              <p class="text-[#e6edf3] text-sm font-medium font-mono">31000319084787</p>
            </div>
            <div class="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
              <p class="text-xs text-[#8b949e]">{t("msb.info.address")}</p>
              <p class="text-[#e6edf3] text-sm font-medium">1500 N Grant St, Boulder, CO 80302</p>
            </div>
            <div class="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
              <p class="text-xs text-[#8b949e]">{t("msb.info.issuer")}</p>
              <p class="text-[#e6edf3] text-sm font-medium">FinCEN (U.S. Department of Treasury)</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
