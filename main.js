async function callBalaboba(text) {
	const key = text.replace(/ /g,"_");
	if (cache[key]) {
		return cache[key];
	} else {
		const response = await fetch("https://zeapi.yandex.net/lab/api/yalm/text3", {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				query: text,
				intro: 0,
				filter: 1
			})
		});

		const result = await response.json();
		if (result.bad_query === 0 && result.error === 0) {
			cache[key] = result.text;
			console.log(cache);
			return result.text;
		} else {
			throw new Error();
		}
	}
}

let cache = {

}


/* Extension functions */
async function readSettings() {
  return new Promise((resolve, reject) => {
		try {
			chrome.runtime.sendMessage({
				type: "getSettings"
			}, answer => resolve(answer))
		} catch (e) {reject()}
  })
}


/* Observe functions */
function startObserveRoot(rootElement, onCreate, onRemove) {
	function isTweetListParent(element) {
		const parent = element.parentNode
		return (element.className == "" && parent.className == "css-1dbjc4n")
	}

	function findTweetListParent(element) {
		if (isTweetListParent(element))
			return element;

		for (const node of element.childNodes) {
			const result = findTweetListParent(node)
			if (result) return result;
		}

		return null;
	}

	let tweetListParent = null;

	function onMutationCallback(mutations) {
		for (const mutation of mutations) {
			if (tweetListParent === null) {
				tweetListParent = findTweetListParent(mutation.target);
				if (tweetListParent !== null) {
					onCreate(tweetListParent);
					console.log("CREATE");
				}
			} else {
				for (const node of mutation.removedNodes) {
					if (node.contains(tweetListParent)) {
						tweetListParent = null;
						onRemove()
						console.log("REMOVE");
					}
				}
			}
		}
	}

	const observer = new MutationObserver(onMutationCallback);
	observer.observe(rootElement, {
		childList: true,
	  subtree: true
	})

	return observer;
}

function startObserveTweetsContainer(root, onNewTweetElement) {
	function onCreateTweetsContainer(element) {
		observer.observe(element, {childList: true});
		onCreateNewTweets(element.childNodes);
	}

	function onRemoveTweetsContainer() {
		observer.disconnect()
	}

	function onMutation(mutations) {
		for (const mutation of mutations) {
			onCreateNewTweets(mutation.addedNodes)
		}
	}

	function onCreateNewTweets(elementNodeList) {
		if (EXTENSION_ACTIVE === false) return;
		for (const tweet of elementNodeList) {
			onNewTweetElement(tweet);
		}
	}

	const observer = new MutationObserver(onMutation);
	return [startObserveRoot(root, onCreateTweetsContainer, onRemoveTweetsContainer), observer]
}


/* Tweets parse functions */
function getSmallTweetBaseContainer(tweet) {
	const containers = tweet.getElementsByClassName("css-1dbjc4n r-1iusvr4 r-16y2uox r-1777fci r-kzbkwu")
	return (containers.length > 0) ? containers[0].lastChild: null;
}

function getBigTweetBaseContainer(tweet) {
	const containers = tweet.getElementsByClassName("css-1dbjc4n r-18u37iz r-15zivkp")
	return (containers.length > 0) ? containers[0].parentNode.lastChild: null;
}

function getTweetBaseContainer(tweet) {
	const smallTweetContainer = getSmallTweetBaseContainer(tweet);
	const bigTweetContainer = getBigTweetBaseContainer(tweet);
	if (bigTweetContainer === null && smallTweetContainer === null)
		return null;

	return (bigTweetContainer != null) ?
		bigTweetContainer: smallTweetContainer;
}

function getTweetPartsFromBaseContainer(tweetBaseContainer) {
	const baseContainerChildList = tweetBaseContainer.childNodes;
	const baseContainerChildArray = Array.prototype.slice.call(baseContainerChildList)
		.filter((node) => node.className === "css-1dbjc4n")

	if (baseContainerChildArray.length >= 2) {
		return baseContainerChildArray.slice(0, 2);
	} else return null;
}

function getTextReplyContainerFromAttachmentBlock(attachmentBlock) {
	const CLASS_NAME = "css-901oao r-18jsvk2 r-1qd0xha r-a023e6 r-16dba41 r-rjixqe r-14gqq1x r-bcqeeo r-bnwqim r-qvutc0"
	const tweetTextReplyContainer = attachmentBlock.getElementsByClassName(CLASS_NAME)

	return (tweetTextReplyContainer.length > 0) ?
		tweetTextReplyContainer[0] : null;
}


/* Tweets text addition functions */
function tweetAddTextFromBalaboba(tweetBlock) {
	const spanElementsChildList = tweetBlock.getElementsByTagName("span");
	const spanElementsChildArray = Array.prototype.slice.call(spanElementsChildList)
		.filter((element) => (element.getAttribute("aria-hidden") !== "true"))

	if (spanElementsChildArray.length === 0)
		return;

	const tweetText = spanElementsChildArray.reduce((accumulator, currentValue) => {
		return `${accumulator} ${currentValue.textContent}`}, "");

	const loadingAnimation = document.createElement("div")
	loadingAnimation.className = "loadin-animation-background"
	tweetBlock.append(loadingAnimation)

	callBalaboba(tweetText).then((addition) => {
		for (const span of spanElementsChildArray) {
			if (span == undefined || span === null) continue;

			span.innerHTML = `<b class = "highlight-original" ${!NEED_HIGHLIGHT_ORIGINAL?'style = "font-weight: normal"':""} >${span.innerHTML}</b>`
		}

		spanElementsChildArray[spanElementsChildArray.length -1].innerHTML += `<span class = "addition-text">&#32;${addition}&#32;</span>`
	}, () => {}).finally(() => {
		loadingAnimation.remove();
	})
}


/* Observe Callback */
function onCreateTweetElement(tweet) {
	const tweetContainer = getTweetBaseContainer(tweet);
	if (tweetContainer === null) return;

	const tweetParts = getTweetPartsFromBaseContainer(tweetContainer);
	if (tweetParts === null) return;

	const [tweetMainTextBlock, tweetAttachmentBlock] = tweetParts;
	const tweetReplyTextContainer = getTextReplyContainerFromAttachmentBlock(tweetAttachmentBlock);

	tweetAddTextFromBalaboba(tweetMainTextBlock)

	if (tweetReplyTextContainer !== null) {
		tweetAddTextFromBalaboba(tweetReplyTextContainer)
	}
}


/*  */

function createWarning() {
  const warningElement = document.createElement("div");
  warningElement.className = "warning-background"
  warningElement.innerHTML = `
    <div class = "warning-window">
      <p class = "warning-text warning-header"> Вы используете расширение, дополняющее твиты с помощью сервиса Яндекса <b><a href = "https://yandex.ru/lab/yalm">"Балабоба"</a></b></p>
      <p class = "warning-text">При использовании расширения распространяются те же правила, что и на "Балабобу". Не ворспринимайте всерьёз тексты, написанные нейросетью, и помните об ответственности, распространяя их. </p>
      <span class = "warning-button" id = "warn-id-001"> Хорошо </span>
    </div>
  `
  document.body.append(warningElement)

  document.getElementById("warn-id-001").addEventListener("click", () => {
    warningElement.remove()
  })
}




let EXTENSION_ACTIVE = true
let NEED_HIGHLIGHT_ORIGINAL = true


setInterval(async () => {
	readSettings().then(settings => {
		if ((NEED_HIGHLIGHT_ORIGINAL !== settings.needHighlight) || (EXTENSION_ACTIVE !== settings.active)) {
			NEED_HIGHLIGHT_ORIGINAL = settings.needHighlight;
			const bolds = document.getElementsByClassName("highlight-original");
			for (bold of bolds) {
				bold.style.fontWeight = (settings.active && NEED_HIGHLIGHT_ORIGINAL) ? null : "normal";
			}
		}

		if (EXTENSION_ACTIVE !== settings.active) {
			EXTENSION_ACTIVE = settings.active;
			if (EXTENSION_ACTIVE === true) {
				location.reload(settings.active)
			} else {
				console.log("DEACTIVATE");
				if (rootObserver) rootObserver.disconnect()
				if (tweetsObserver) tweetsObserver.disconnect()

				const adds = document.getElementsByClassName("addition-text");
				for (add of adds) {
					add.style.display = "none";
				}

			}
		}
	})
}, 1000)



let rootObserver, tweetsObserver;
const root = document.getElementById("react-root");
readSettings().then(settings => {
	if (settings.active === true) {
		createWarning();
		NEED_HIGHLIGHT_ORIGINAL = settings.needHighlight;
		EXTENSION_ACTIVE = settings.active;
		[rootObserver, tweetsObserver] = startObserveTweetsContainer(root, onCreateTweetElement)
	}
})
