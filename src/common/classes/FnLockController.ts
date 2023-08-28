import { SysFsPropertyBoolean } from "./SysFsProperties";

export class FnLockController {
    fnLock = new SysFsPropertyBoolean("/sys/devices/platform/tuxedo_keyboard/fn_lock");

    getFnLockSupported = () => this.fnLock.isAvailable();

    getFnLockStatus = () => this.fnLock.readValueNT();

    setFnLockStatus = (status: boolean) => this.fnLock.writeValue(status);
}