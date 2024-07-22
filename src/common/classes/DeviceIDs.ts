// https://dgpu-docs.intel.com/devices/hardware-table.html
export const intelIGpuDeviceIds = [
    // Xe Raptor Lake-P (Intel Iris Xe Graphics)
    "A7A9",
    "A7A8",
    "A7A1",
    "A7A0",
    "A721",
    "A720",

    // Xe Raptor Lake-S (Intel UHD Graphics)
    "A78B",
    "A78A",
    "A789",
    "A788",
    "A783",
    "A782",
    "A781",
    "A780",

    // Xe Alder Lake-S (Intel UHD Graphics)
    "4680",
    "4682",
    "4688",
    "468A",
    "468B",
    "4690",
    "4692",
    "4693",

    // Xe Alder Lake-N (Intel UHD Graphics)
    "46D0",
    "46D1",
    "46D2",

    // Xe Alder Lake (Intel UHD Graphics)
    "4626",
    "4628",
    "462A",
    "46A0",
    "46A1",
    "46A2",
    "46A3",
    "46A6",
    "46A8",
    "46AA",
    "46B0",
    "46B1",
    "46B2",
    "46B3",
    "46C0",
    "46C1",
    "46C2",
    "46C3",

    // Xe Rocket Lake (Intel UHD Graphics)
    "4C8A",
    "4C8B",
    "4C90",
    "4C9A",
    "4C8C",
    "4C80",

    // Xe Jasper Lake (Intel UHD Graphics)
    "4E71",
    "4E61",
    "4E57",
    "4E55",
    "4E51",

    // Xe Elkhart Lake (Intel UHD Graphics)
    "4571",
    "4557",
    "4555",
    "4551",
    "4541",

    // Xe Tiger Lake (Intel UHD Graphics)
    "9A59",
    "9A60",
    "9A68",
    "9A70",

    // Xe Tiger Lake (Intel Iris Xe Graphics)
    "9A40",
    "9A49",

    // Xe Tiger Lake (Intel UHD Graphics)
    "9A78",
    "9AC0",
    "9AC9",
    "9AD9",
    "9AF8",

    // Gen11 Ice Lake (Intel HD Graphics)
    "8A70",
    "8A71",

    // Gen11 Ice Lake (Intel UHD Graphics)
    "8A56",
    "8A58",

    // Gen11 Ice Lake (Intel HD Graphics)
    "8A5B",
    "8A5D",

    // Gen11 Ice Lake (Intel Iris Plus Graphics)
    "8A54",
    "8A5A",
    "8A5C",

    // Gen11 Ice Lake (Intel HD Graphics)
    "8A57",
    "8A59",

    // Gen11 Ice Lake (Intel HD Graphics)
    "8A50",

    // Gen11 Ice Lake (Intel Iris Plus Graphics)
    "8A51",
    "8A52",
    "8A53",

    // Gen9 Coffee Lake (Intel Iris Plus Graphics 655)
    "3EA5",
    "3EA8",

    // Gen9 Coffee Lake (Intel Iris Plus Graphics 645)
    "3EA6",

    // Gen9 Coffee Lake (Intel HD Graphics)
    "3EA7",

    // Gen9 Coffee Lake (Intel UHD Graphics)
    "3EA2",

    // Gen9 Coffee Lake (Intel UHD Graphics 610)
    "3E90",
    "3E93",
    "3E99",
    "3E9C",
    "3EA1",
    "9BA5",
    "9BA8",

    // Gen9 Coffee Lake (Intel UHD Graphics)
    "3EA4",
    "9B21",
    "9BA0",
    "9BA2",
    "9BA4",
    "9BAA",
    "9BAB",
    "9BAC",

    // Gen9 Coffee Lake (Intel UHD Graphics)
    "87CA",
    "3EA3",
    "9B41",
    "9BC0",
    "9BC2",
    "9BC4",
    "9BCA",
    "9BCB",
    "9BCC",

    // Gen9 Coffee Lake (Intel UHD Graphics 630)
    "3E91",
    "3E92",
    "3E98",
    "3E9B",
    "9BC5",
    "9BC8",

    // Gen9 Coffee Lake (Intel UHD Graphics P630)
    "3E96",
    "3E9A",
    "3E94",
    "9BC6",
    "9BE6",
    "9BF6",

    // Gen9 Coffee Lake (Intel UHD Graphics 620)
    "3EA9",
    "3EA0",

    // Gen9 Kaby Lake (Intel HD Graphics)
    "593B",

    // Gen9 Kaby Lake (Intel HD Graphics 635)
    "5923",

    // Gen9 Kaby Lake (Intel Iris Plus Graphics 640)
    "5926",

    // Gen9 Kaby Lake (Intel Iris Plus Graphics 650)
    "5927",

    // Gen9 Kaby Lake (Intel UHD Graphics 620)
    "5917",

    // Gen9 Kaby Lake (Intel HD Graphics 630)
    "5912",
    "591B",

    // Gen9 Kaby Lake (Intel HD Graphics 620)
    "5916",
    "5921",

    // Gen9 Kaby Lake (Intel HD Graphics P630)
    "591A",
    "591D",

    // Gen9 Kaby Lake (Intel HD Graphics 615)
    "591E",

    // Gen9 Kaby Lake (Intel UHD Graphics 615)
    "591C",

    // Gen9 Kaby Lake (Intel UHD Graphics 617)
    "87C0",

    // Gen9 Kaby Lake (Intel HD Graphics)
    "5913",
    "5915",

    // Gen9 Kaby Lake (Intel HD Graphics 610)
    "5902",
    "5906",
    "590B",

    // Gen9 Kaby Lake (Intel HD Graphics)
    "590A",
    "5908",
    "590E",

    // Gen9 Gemini Lake (Intel UHD Graphics 600)
    "3185",

    // Gen9 Gemini Lake (Intel UHD Graphics 605)
    "3184",

    // Gen9 Apollo Lake (Intel HD Graphics)
    "1A85",

    // Gen9 Apollo Lake (Intel HD Graphics 500)
    "5A85",

    // Gen9 Apollo Lake (Intel HD Graphics)
    "0A84",
    "1A84",

    // Gen9 Apollo Lake (Intel HD Graphics 505)
    "5A84",

    // Gen9 Skylake (Intel HD Graphics)
    "192A",

    // Gen9 Skylake (Intel Iris Pro Graphics 580)
    "1932",
    "193B",

    // Gen9 Skylake (Intel Iris Pro Graphics P580)
    "193A",
    "193D",

    // Gen9 Skylake (Intel HD Graphics 535)
    "1923",

    // Gen9 Skylake (Intel Iris Graphics 540)
    "1926",

    // Gen9 Skylake (Intel Iris Graphics 550)
    "1927",

    // Gen9 Skylake (Intel Iris Graphics 555)
    "192B",

    // Gen9 Skylake (Intel Iris Graphics P555)
    "192D",

    // Gen9 Skylake (Intel HD Graphics 530)
    "1912",
    "191B",

    // Gen9 Skylake (Intel HD Graphics)
    "1913",
    "1915",
    "1917",
    "191A",

    // Gen9 Skylake (Intel HD Graphics 520)
    "1916",
    "1921",

    // Gen9 Skylake (Intel HD Graphics P530)
    "191D",

    // Gen9 Skylake (Intel HD Graphics 515)
    "191E",

    // Gen9 Skylake (Intel HD Graphics 510)
    "1902",
    "1906",
    "190B",

    // Gen9 Skylake (Intel HD Graphics)
    "190A",
    "190E",

    // Gen8 Broadwell (Intel HD Graphics)
    "163D",
    "163A",
    "1632",
    "163E",
    "163B",
    "1636",

    // Gen8 Broadwell (Intel Iris Pro Graphics 6200)
    "1622",

    // Gen8 Broadwell (Intel HD Graphics 6000)
    "1626",

    // Gen8 Broadwell (Intel Iris Pro Graphics P6300)
    "162A",

    // Gen8 Broadwell (Intel Iris Graphics 6100)
    "162B",

    // Gen8 Broadwell (Intel HD Graphics)
    "162D",
    "162E",

    // Gen8 Broadwell (Intel HD Graphics 5600)
    "1612",

    // Gen8 Broadwell (Intel HD Graphics 5500)
    "1616",

    // Gen8 Broadwell (Intel HD Graphics P5700)
    "161A",

    // Gen8 Broadwell (Intel HD Graphics)
    "161B",
    "161D",

    // Gen8 Broadwell (Intel HD Graphics 5300)
    "161E",

    // Gen8 Broadwell (Intel HD Graphics)
    "1602",
    "1606",
    "160A",
    "160B",
    "160D",
    "160E",

    // Gen8 Cherryview (Intel HD Graphics)
    "22B0",
    "22B2",
    "22B3",

    // Gen8 Cherryview (Intel HD Graphics XXX)
    "22B1",

    // Gen7 Bay Trail (Intel HD Graphics)
    "0F30",
    "0F31",
    "0F32",
    "0F33",
    "0157",
    "0155",

    // Gen7 Haswell (Intel HD Graphics)
    "0422",
    "0426",
    "042A",
    "042B",
    "042E",
    "0C22",
    "0C26",
    "0C2A",
    "0C2B",
    "0C2E",
    "0A22",
    "0A2A",
    "0A2B",
    "0D2A",
    "0D2B",
    "0D2E",

    // Gen7 Haswell (Intel HD Graphics 5000)
    "0A26",

    // Gen7 Haswell (Intel Iris Graphics 5100)
    "0A2E",

    // Gen7 Haswell (Intel Iris Pro Graphics 5200)
    "0D22",

    // Gen7 Haswell (Intel Iris Pro Graphics P5200)
    "0D26",

    // Gen7 Haswell (Intel HD Graphics 4600)
    "0412",
    "0416",
    "0D12",

    // Gen7 Haswell (Intel HD Graphics P4600/P4700)
    "041A",

    // Gen7 Haswell (Intel HD Graphics)
    "041B",
    "0C12",
    "0C16",
    "0C1A",
    "0C1B",
    "0C1E",
    "0A12",
    "0A1A",
    "0A1B",
    "0D16",
    "0D1A",
    "0D1B",
    "0D1E",

    // Gen7 Haswell (Intel HD Graphics 4400)
    "041E",
    "0A16",

    // Gen7 Haswell (Intel HD Graphics 4200)
    "0A1E",

    // Gen7 Haswell (Intel HD Graphics)
    "0402",
    "0406",
    "040A",
    "040B",
    "040E",
    "0C02",
    "0C06",
    "0C0A",
    "0C0B",
    "0C0E",
    "0A02",
    "0A06",
    "0A0A",
    "0A0B",
    "0A0E",
    "0D02",
    "0D06",
    "0D0A",
    "0D0B",
    "0D0E",

    // Gen7 Ivy Bridge (Intel HD Graphics 4000)
    "0162",
    "0166",

    // Gen7 Ivy Bridge (Intel HD Graphics P4000)
    "016A",

    // Gen7 Ivy Bridge (Intel HD Graphics 2500)
    "0152",
    "0156",

    // Gen7 Ivy Bridge (Intel HD Graphics)
    "015A",

    // Gen6 Sandy Bridge (Intel HD Graphics 3000)
    "0112",
    "0122",
    "0116",
    "0126",

    // Gen6 Sandy Bridge (Intel HD Graphics 2000)
    "0102",
    "0106",
    "010A",

    // Gen5 Iron Lake (Intel HD Graphics)
    "0042",
    "0046",
];

const intelVendorId = "8086";
export const intelIGpuDeviceIdString = intelIGpuDeviceIds
    .map((id) => `${intelVendorId}:${id}`)
    .join("|");

// https://github.com/openbsd/src/blob/master/sys/dev/pci/drm/amd/amdgpu/amdgpu_devlist.h
// https://github.com/torvalds/linux/blob/master/drivers/gpu/drm/amd/amdgpu/amdgpu_drv.c
export const amdIGpuDeviceIds = [
    // Raphael
    "164E",

    // Mendocino
    "1506",

    // Picasso / Raven
    "15DD",
    "15D8",

    // Renoir
    "15E7",
    "1636",
    "1638",
    "164C",

    // Rembrandt / Yellow Carp
    "164D",
    "1681",

    // Phoenix
    "15BF",

    // Phoenix 2
    "15C8",

    // Kaveri
    "1304",
    "1305",
    "1306",
    "1307",
    "1309",
    "130A",
    "130B",
    "130C",
    "130D",
    "130E",
    "130F",
    "1310",
    "1311",
    "1312",
    "1313",
    "1315",
    "1316",
    "1317",
    "1318",
    "131B",
    "131C",
    "131D",

    // Kabini
    "9830",
    "9831",
    "9832",
    "9833",
    "9834",
    "9835",
    "9836",
    "9837",
    "9838",
    "9839",
    "983a",
    "983b",
    "983c",
    "983d",
    "983e",
    "983f",

    // mullins
    "9850",
    "9851",
    "9852",
    "9853",
    "9854",
    "9855",
    "9856",
    "9857",
    "9858",
    "9859",
    "985A",
    "985B",
    "985C",
    "985D",
    "985E",
    "985F",

    // carrizo
    "9870",
    "9874",
    "9875",
    "9876",
    "9877",

    // stoney
    "98E4",

    // CYAN_SKILLFISH
    "13FE",
    "143F",

    // Aqua Vanjaram
    "74A0",

    // Van Gogh
    "1435",
    "163f",

    // Hawk Point
    "1900",
    "1901",
];

const amdVendorId = "1002";
export const amdIGpuDeviceIdString = amdIGpuDeviceIds
    .map((id) => `${amdVendorId}:${id}`)
    .join("|");

const amdDGpuDeviceIds = [
    // 7600M XT
    "7480",
];

export const amdDGpuDeviceIdString = amdDGpuDeviceIds
    .map((id) => `${amdVendorId}:${id}`)
    .join("|");
