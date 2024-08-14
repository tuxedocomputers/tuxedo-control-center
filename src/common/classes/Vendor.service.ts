import { Injectable } from "@angular/core";
import { execCommandAsync } from "./Utils";

@Injectable({
    providedIn: "root",
})
export class VendorService {
    private cpuVendor: string | null = null;

    constructor() {
        this.checkCpuVendor().then((vendor: string): void => {
            this.cpuVendor = vendor;
        });
    }

    async getCpuVendor(): Promise<string> {
        if (this.cpuVendor !== null) {
            return this.cpuVendor;
        }

        const vendor: string = await this.checkCpuVendor();
        this.cpuVendor = vendor;

        return vendor;
    }

    private async checkCpuVendor(): Promise<string> {
        const stdout: string = (
            await execCommandAsync("cat /proc/cpuinfo | grep vendor_id")
        ).toString();

        const outputLines: string[] = stdout.split("\n");
        const vendorLine: string = outputLines.find((line: string): boolean =>
            line.includes("vendor_id")
        );

        if (vendorLine) {
            const vendor: string = vendorLine.split(":")[1].trim();

            if (vendor === "GenuineIntel") {
                return "intel";
            } else if (vendor === "AuthenticAMD") {
                return "amd";
            }
        }
        return "unknown";
    }
}
