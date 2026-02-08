import { type Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { t } from "@shared/i18n";

export const Footer: Component = () => {
  const navigate = useNavigate();

  return (
    <footer class="border-t border-[#30363d] bg-[#0d1117] py-8 mt-auto">
      <div class="max-w-[1600px] mx-auto px-4">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div class="space-y-2">
            <h3 class="text-[#e6edf3] font-semibold text-lg">HuoBTC</h3>
            <p class="text-[#8b949e] text-sm">{t("footer.subsidiary")}</p>
            <p class="text-[#8b949e] text-xs max-w-md">
              1500 N Grant St, Boulder, Colorado 80302, USA
            </p>
          </div>

          <div class="flex flex-col items-end gap-3">
            <div class="flex gap-6 text-sm">
              <button type="button" class="text-[#8b949e] hover:text-[#00f0ff] transition-colors" onClick={() => navigate("/about")}>{t("footer.about")}</button>
              <button type="button" class="text-[#8b949e] hover:text-[#00f0ff] transition-colors" onClick={() => navigate("/msb")}>{t("footer.msb")}</button>
              <button type="button" class="text-[#8b949e] hover:text-[#00f0ff] transition-colors" onClick={() => navigate("/privacy")}>{t("footer.privacy")}</button>
            </div>
            <div class="text-right space-y-1">
              <p class="text-[#8b949e] text-xs">
                MSB Registration Number: <span class="text-[#e6edf3] font-mono">31000319084787</span>
              </p>
              <p class="text-[#8b949e] text-xs opacity-80">
                {t("footer.noPrivateKey")}
              </p>
            </div>
          </div>
        </div>

        <div class="mt-8 pt-6 border-t border-[#30363d] text-center">
          <p class="text-[#8b949e] text-xs">
            © {new Date().getFullYear()} HuoBTC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
