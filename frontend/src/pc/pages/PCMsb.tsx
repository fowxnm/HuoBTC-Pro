import { useNavigate } from "@solidjs/router";
import { t } from "@shared/i18n";

export default function PCMsb() {
  const navigate = useNavigate();
  return (
    <div class="max-w-[900px] mx-auto px-6 py-12 text-[#e6edf3]">
      <button type="button" class="text-sm text-[#8b949e] hover:text-[#00f0ff] mb-6 transition-colors" onClick={() => navigate(-1)}>{t("common.back")}</button>

      <h1 class="text-3xl font-bold mb-8">{t("msb.title")}</h1>

      <section class="space-y-6 text-[#8b949e] leading-relaxed">
        <div class="p-6 rounded-xl border border-[#30363d] bg-[#161b22]">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-[#00f0ff]/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <p class="text-[#e6edf3] font-semibold">{t("msb.regNumber")}</p>
              <p class="text-[#00f0ff] text-lg font-mono">31000319084787</p>
            </div>
          </div>
          <p class="text-sm">{t("msb.description")}</p>
        </div>

        <div>
          <h2 class="text-xl font-semibold text-[#e6edf3] mb-3">{t("msb.what.title")}</h2>
          <p>{t("msb.what.text")}</p>
        </div>

        <div>
          <h2 class="text-xl font-semibold text-[#e6edf3] mb-3">{t("msb.compliance.title")}</h2>
          <ul class="list-disc list-inside space-y-2">
            <li>AML (Anti-Money Laundering)</li>
            <li>KYC (Know Your Customer)</li>
            <li>SAR (Suspicious Activity Reports)</li>
            <li>Transaction Records & Audit Trail</li>
            <li>Regular Compliance Reviews</li>
          </ul>
        </div>

        <div>
          <h2 class="text-xl font-semibold text-[#e6edf3] mb-3">{t("msb.info.title")}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-4 rounded-lg bg-[#0d1117] border border-[#30363d]">
              <p class="text-xs text-[#8b949e] mb-1">{t("msb.info.name")}</p>
              <p class="text-[#e6edf3] font-medium">HuoBTC (AIMS subsidiary)</p>
            </div>
            <div class="p-4 rounded-lg bg-[#0d1117] border border-[#30363d]">
              <p class="text-xs text-[#8b949e] mb-1">{t("msb.info.number")}</p>
              <p class="text-[#e6edf3] font-medium font-mono">31000319084787</p>
            </div>
            <div class="p-4 rounded-lg bg-[#0d1117] border border-[#30363d]">
              <p class="text-xs text-[#8b949e] mb-1">{t("msb.info.address")}</p>
              <p class="text-[#e6edf3] font-medium">1500 N Grant St, Boulder, CO 80302</p>
            </div>
            <div class="p-4 rounded-lg bg-[#0d1117] border border-[#30363d]">
              <p class="text-xs text-[#8b949e] mb-1">{t("msb.info.issuer")}</p>
              <p class="text-[#e6edf3] font-medium">FinCEN (U.S. Department of Treasury)</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
