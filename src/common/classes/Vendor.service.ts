import { Injectable } from "@angular/core";
import { exec } from "child_process";

@Injectable({
    providedIn: "root",
})
export class VendorService {
    private cpuVendor: string | null = null;

    constructor() {
        this.checkCpuVendor().then((vendor) => {
            this.cpuVendor = vendor;
        });
    }

    async getCpuVendor(): Promise<string> {
        if (this.cpuVendor !== null) {
            return this.cpuVendor;
        }

        const vendor = await this.checkCpuVendor();
        this.cpuVendor = vendor;

        return vendor;
    }

    private async checkCpuVendor(): Promise<string> {
        const stdout = (
            await this.execCommand("cat /proc/cpuinfo | grep vendor_id")
        ).toString();

        const outputLines = stdout.split("\n");
        const vendorLine = outputLines.find((line) =>
            line.includes("vendor_id")
        );

        if (vendorLine) {
            const vendor = vendorLine.split(":")[1].trim();

            if (vendor === "GenuineIntel") {
                return "intel";
            } else if (vendor === "AuthenticAMD") {
                return "amd";
            }
        }
        return "unknown";
    }

    async execCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error || stderr) {
                    resolve(undefined);
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }
}
