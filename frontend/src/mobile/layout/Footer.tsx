import { type Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { t } from "@shared/i18n";

export const Footer: Component = () => {
    const navigate = useNavigate();

    return (
        <footer class="py-8 px-4 text-center space-y-5 pb-24 text-[#8b949e]">
            <div class="space-y-2">
                <h3 class="text-[#e6edf3] font-semibold text-lg">HuoBTC</h3>
                <p class="text-xs">{t("footer.subsidiary")}</p>
                <p class="text-[10px] opacity-80">
                    1500 N Grant St, Boulder, Colorado 80302, USA
                </p>
            </div>

            <div class="flex justify-center gap-5 text-xs">
                <button type="button" class="hover:text-[#00f0ff] transition-colors" onClick={() => navigate("/about")}>{t("footer.about")}</button>
                <button type="button" class="hover:text-[#00f0ff] transition-colors" onClick={() => navigate("/msb")}>{t("footer.msb")}</button>
                <button type="button" class="hover:text-[#00f0ff] transition-colors" onClick={() => navigate("/privacy")}>{t("footer.privacy")}</button>
            </div>

            <div class="space-y-1 text-[10px]">
                <p>MSB Registration Number: <span class="text-[#e6edf3] font-mono">31000319084787</span></p>
                <p class="opacity-80">{t("footer.noPrivateKey")}</p>
            </div>

            <div class="border-t border-[#2c2c3e] w-1/2 mx-auto pt-4">
                <p class="text-[10px]">© {new Date().getFullYear()} HuoBTC. All rights reserved.</p>
            </div>
        </footer>
    );
};
