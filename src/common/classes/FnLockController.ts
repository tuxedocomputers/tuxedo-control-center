import { SysFsPropertyBoolean } from "./SysFsProperties";

export class FnLockController {
    fnLock: SysFsPropertyBoolean = new SysFsPropertyBoolean("/sys/devices/platform/tuxedo_keyboard/fn_lock");

    getFnLockSupported: () => boolean = (): boolean => this.fnLock.isAvailable();

    getFnLockStatus: () => boolean  = (): boolean => this.fnLock.readValueNT();

    setFnLockStatus: (status: boolean) => void = (status: boolean): void => this.fnLock.writeValue(status);
}