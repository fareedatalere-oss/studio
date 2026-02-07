// These codes are based on Flutterwave's bill payment structure.

export const airtimeProviders = [
    { name: 'MTN', biller_code: 'MTN' },
    { name: 'Airtel', biller_code: 'AIRTEL' },
    { name: 'Glo', biller_code: 'GLO' },
    { name: '9mobile', biller_code: '9MOBILE' },
];

export const dataProviders = [
    { 
        name: 'MTN',
        biller_code: 'MTN_DATA',
        plans: [
            { name: '1GB - 30 days', amount: 350, item_code: 'MTN_DATA_350' },
            { name: '2.5GB - 2 days', amount: 500, item_code: 'MTN_DATA_500' },
            { name: '4.5GB - 30 days', amount: 1000, item_code: 'MTN_DATA_1000' },
        ]
    },
    { 
        name: 'Airtel',
        biller_code: 'AIRTEL_DATA',
        plans: [
            { name: '1GB - 30 days', amount: 350, item_code: 'AIRTEL_DATA_350' },
            { name: '3GB - 7 days', amount: 500, item_code: 'AIRTEL_DATA_500' },
            { name: '6GB - 30 days', amount: 1000, item_code: 'AIRTEL_DATA_1000' },
        ]
    },
     { 
        name: 'Glo',
        biller_code: 'GLO_DATA',
        plans: [
            { name: '1.35GB - 14 days', amount: 500, item_code: 'GLO_DATA_500' },
            { name: '3.9GB - 30 days', amount: 1000, item_code: 'GLO_DATA_1000' },
        ]
    },
     { 
        name: '9mobile',
        biller_code: '9MOBILE_DATA',
        plans: [
            { name: '1GB - 30 days', amount: 1000, item_code: '9MOBILE_DATA_1000' },
             { name: '4.5GB - 30 days', amount: 2000, item_code: '9MOBILE_DATA_2000' },
        ]
    },
];

export const tvProviders = [
    {
        name: 'DSTV',
        biller_code: 'DSTV',
        plans: [
            { name: 'Padi', amount: 2900, item_code: 'DSTV_PADI' },
            { name: 'Yanga', amount: 4200, item_code: 'DSTV_YANGA' },
            { name: 'Confam', amount: 7400, item_code: 'DSTV_CONFAM' },
            { name: 'Compact', amount: 12500, item_code: 'DSTV_COMPACT' },
        ]
    },
    {
        name: 'GOTV',
        biller_code: 'GOTV',
        plans: [
            { name: 'Smallie', amount: 1300, item_code: 'GOTV_SMALLIE' },
            { name: 'Jinja', amount: 2700, item_code: 'GOTV_JINJA' },
            { name: 'Jolli', amount: 3950, item_code: 'GOTV_JOLLI' },
            { name: 'Max', amount: 5700, item_code: 'GOTV_MAX' },
        ]
    },
    {
        name: 'Startimes',
        biller_code: 'STARTIMES',
        plans: [
            { name: 'Nova', amount: 1500, item_code: 'STARTIMES_NOVA' },
            { name: 'Basic', amount: 2600, item_code: 'STARTIMES_BASIC' },
            { name: 'Smart', amount: 3500, item_code: 'STARTIMES_SMART' },
        ]
    }
];

export const electricityProviders = [
    { name: 'Ikeja Electric (IKEDC)', biller_code: 'BIL118' },
    { name: 'Eko Electric (EKEDC)', biller_code: 'BIL115' },
    { name: 'Abuja Electric (AEDC)', biller_code: 'BIL113' },
    { name: 'Kano Electric (KEDCO)', biller_code: 'BIL119' },
    { name: 'Port Harcourt Electric (PHED)', biller_code: 'BIL120' },
    { name: 'Jos Electric (JED)', biller_code: 'BIL121' },
    { name: 'Kaduna Electric (KAEDCO)', biller_code: 'BIL122' },
    { name: 'Enugu Electric (EEDC)', biller_code: 'BIL116' },
    { name: 'Ibadan Electric (IBEDC)', biller_code: 'BIL117' },
    { name: 'Benin Electric (BEDC)', biller_code: 'BIL114' },
    { name: 'Yola Electric (YEDC)', biller_code: 'BIL123' },
];
