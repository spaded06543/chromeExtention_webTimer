export function AlarmData() {
    this.totalUsingTime = 0;
    this.lastAlarmTime = 0;
    this.updateTime = -1;
};

export function ValueHandler(key, value)
{
    console.debug(`init <${key}> : ${JSON.stringify(value)}`);
    this.key = key;
    this.value = value;
    this.listeners = new Array();
    let valueHandler = this;

    chrome.storage.local
        .onChanged
        .addListener(
            function(changes)
            {
                let targetChange = changes[key];
                if (targetChange !== undefined)
                {
                    valueHandler.value = targetChange.newValue;
                    valueHandler.listeners.forEach(function(callBack) 
                        {
                            callBack(targetChange.oldValue, targetChange.newValue);
                        });
                }
            });
};

ValueHandler.prototype = 
    {
        addListener: function(newListener)
        {
            if (this.listeners.indexOf(newListener) != -1)
                return;
            this.listeners.push(newListener);
        },
        removeListener: function(target)
        {
            var listenerIndex = this.listeners.indexOf(target);
            if (listenerIndex == -1)
                return;
            this.listeners.slice(listenerIndex, 1);
        },
        saveValue: function(newValue)
        {
            console.debug(`save <${this.key}> : ${JSON.stringify(newValue)}`);
            return chrome.storage.local.set({[this.key] : newValue});
        }
    };

export const timeSaverInitializationPromise = (
    async function () {
        async function createValueHandler(key, defaultValue)
        {
            let value = (await chrome.storage.local.get(key))[key];
            return new ValueHandler(key, value ?? defaultValue);
        }

        let dataHandlers = await Promise.all(
            [
                createValueHandler("alarmPeriod", 10),
                createValueHandler("rawData", []),
                createValueHandler("snsAlarmData", new AlarmData())
            ]);
        

        return {
            alarmName: "mySnsAlarm",
            dataToInfoString: (data, alarmPeriod) => `Total spending time : ${data.totalUsingTime.toFixed(0)} minutes.\nNext alarm time : ${(data.lastAlarmTime + alarmPeriod).toFixed(0)} minutes`,
            dataHandler:  
                {
                    alarmPeriod: dataHandlers[0],
                    urlList: dataHandlers[1],
                    alarmData: dataHandlers[2]
                },
        };
    })();