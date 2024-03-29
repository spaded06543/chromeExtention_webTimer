export const timeSaver = (
    function () {
        const alarmDataKey = "snsAlarmData";
        const rawUrlListKey = "rawData";
        const updateTimeKey = "updateTime";
        const totalUsingTimeKey = "totalUsingTime";
        const nextAlarmUsingTimeKey = "nextAlarmUsingTime";
        
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

        function saveAlarmData(data) {
            data.updateTime = Date.now();

            console.log(`set data : ${JSON.stringify(data)}`);

            return chrome.storage.local.set({[alarmDataKey] : data});
        }

        let urlListCache = [];
        
        chrome.storage.local
            .get(rawUrlListKey)
            .then((rawData) =>
                {
                    try
                    {
                        var context = rawData[rawUrlListKey];
                        if(context !== undefined)
                            urlListCache = JSON.parse(context);
                    }
                    catch(error)
                    {
                        console.log(`error on getting local url list\n=====\n${error}\n=====`);
                        urlListCache = [];
                    }
                    broadcastNewUrlList(urlListCache);
                });
        
        var saveUrlCache = () => chrome.storage.local.set({ [rawUrlListKey] : JSON.stringify(urlListCache) });
        var broadcastNewUrlList = () => changeListeners.forEach(callBack => callBack(urlListCache));
        chrome.storage.local
            .onChanged
            .addListener((changes) =>
                {
                    if (changes[rawUrlListKey] !== undefined)
                        broadcastNewUrlList(urlListCache);
                });

        let changeListeners = [];

        function addUrlChangedEventListener(callBack)
        {
            if (changeListeners.indexOf(callBack) != -1)
                return;
            changeListeners.push(callBack);
            callBack(urlListCache);
        }

        function removeUrlChangedEventListener(callBack)
        {
            var listenerIndex = changeListeners.indexOf(callBack);
            if (listenerIndex == -1)
                return;
            changeListeners.slice(listenerIndex, 1);
        }


        return {
            alarmName: "mySnsAlarm",
            alarmTimeInMinutes: 10,
            alarmTimePeriodInMinutes: 0.1,
            createDefaultData: createDefaultData,
            getAlarmData: getAlarmData,
            saveAlarmData: saveAlarmData,
            dataToInfoString: (data) => `Total spending time : ${data.totalUsingTime.toFixed(0)} minutes.\nNext alarm time : ${data.nextAlarmUsingTime} minutes`,
            addUrl: async (addedUrl) =>
                {
                    if(urlListCache.indexOf(addedUrl) != -1)
                        return;
                    urlListCache.push(addedUrl);
                    await saveUrlCache();
                },
            removeUrl: async (removedUrl) =>
                {
                    var targetIndex = urlListCache.indexOf(removedUrl);
                    if(targetIndex == -1)
                        return;
                    urlListCache.splice(targetIndex, 1);
                    await saveUrlCache();
                },
            onLocalStorageUrlListChange:{
                addListener: addUrlChangedEventListener,
                removeListener: removeUrlChangedEventListener 
            }
        };
    })();