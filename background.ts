// let targetSnsSets: Array<string> = 
//     ['https://www.facebook.com/'];
// let alarmTime: number = 10;
// chrome.action.onClicked.addListener(
//     async (tab: chrome.tabs.Tab) =>
//     {
//         let targetSns = targetSnsSets.find((val, _, __) => tab.url?.startsWith(val)) ?? "null";
//         if(targetSns === "null")
//             return;
//         alert("Test");
//     });