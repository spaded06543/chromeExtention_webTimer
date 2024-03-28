export const timeSaver = (
    function () {
        const alarmDataKey = "snsAlarmData";
        const rawUrlListKey = "rawData";
        const updateTimeKey = "updateTime";
        const totalUsingTimeKey = "totalUsingTime";
        const nextAlarmUsingTimeKey = "nextAlarmUsingTime";
        const listUpdateTimeKey = "listUpdateTime";
        
        function createDefaultData() {
            return {
                [totalUsingTimeKey]: 0,
                [nextAlarmUsingTimeKey]: timeSaver.alarmTimeInMinutes,
                [updateTimeKey]: -1
            };
        }

        async function getAlarmData() {
            let result = await chrome.storage.local.get(alarmDataKey);

            if (Object.keys(result).length == 0)
                return createDefaultData();

            console.log(`get data : ${JSON.stringify(result)}`);

            return result[alarmDataKey];
        }

        async function saveAlarmData(data) {
            data.updateTime = Date.now();

            console.log(`set data : ${JSON.stringify(data)}`);

            await chrome.storage.local.set({[alarmDataKey] : data});
        }

        let cacheUpdatedTime = -1;
        let urlListCache = undefined;
        async function getUrlList()
        {
            let latestUpdateTime = await chrome.storage.local.get(listUpdateTimeKey);
            if (Object.keys(latestUpdateTime).length == 0)
                return [];
            latestUpdateTime = latestUpdateTime[listUpdateTimeKey];
            console.log(`ulala : ${JSON.stringify(latestUpdateTime)}`);
            
            if(urlListCache !== undefined && cacheUpdatedTime >= latestUpdateTime)
                return urlListCache;

            cacheUpdatedTime = latestUpdateTime;
            let rawData = await chrome.storage.local.get(rawUrlListKey);
            if (Object.keys(rawData).length == 0)
                return [];
            urlListCache = JSON.parse(rawData[rawUrlListKey]);
            return urlListCache;
        }

        async function saveUrlList(urlList)
        {
            urlListCache = urlList;
            cacheUpdatedTime = Date.now();
            return chrome.storage.local.set(
                {
                    [listUpdateTimeKey] : cacheUpdatedTime,
                    [rawUrlListKey] : JSON.stringify(urlList)
                });
        }

        function dataToInfoString(data)
        {
            return `Total spending time : ${data.totalUsingTime.toFixed(0)} minutes.\nNext alarm time : ${data.nextAlarmUsingTime} minutes`;
        }

        return {
            alarmName: "mySnsAlarm",
            alarmTimeInMinutes: 10,
            alarmTimePeriodInMinutes: 0.1,
            createDefaultData: createDefaultData,
            getAlarmData: getAlarmData,
            saveAlarmData: saveAlarmData,
            dataToInfoString: dataToInfoString,
            getUrlList: getUrlList,
            saveUrlList: saveUrlList
        };
    }
)();