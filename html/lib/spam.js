/**
* @author Irvin Owens Jr<0x8badbeef@sigsegv.us>
* @file spam.js
* @description A bayesian spam filter for processing text in JavaScript
*/

// The spam filter keyspace
// P(spam) = 0.5
// P(ham) = 0.5

var Spam = (function(){
  var wordList = { };
  // the set of stopwords
  var stopWords = [
  'a', 'about', 'above', 'across', 'after', 'afterwards',
  'again', 'against', 'all', 'almost', 'alone', 'along',
  'already', 'also', 'although', 'always', 'am', 'among',
  'amongst', 'amongst', 'amount', 'an', 'and', 'another',
  'any', 'anyhow', 'anyone', 'anything', 'anyway', 'anywhere',
  'are', 'around', 'as', 'at', 'back', 'be',
  'became', 'because', 'become', 'becomes', 'becoming', 'been',
  'before', 'beforehand', 'behind', 'being', 'below', 'beside',
  'besides', 'between', 'beyond', 'bill', 'both', 'bottom',
  'but', 'by', 'call', 'can', 'cannot', 'cant', 'dont',
  'co', 'computer', 'con', 'could', 'couldnt', 'cry',
  'de', 'describe', 'detail', 'do', 'done', 'down',
  'due', 'during', 'each', 'eg', 'eight', 'either',
  'eleven', 'else', 'elsewhere', 'empty', 'enough', 'etc', 'even', 'ever',
  'every', 'everyone', 'everything', 'everywhere', 'except', 'few', 'fifteen',
  'fifty', 'fill', 'find', 'fire', 'first', 'five',
  'for', 'former', 'formerly', 'forty', 'found', 'four',
  'from', 'front', 'full', 'further', 'get', 'give',
  'go', 'had', 'has', 'hasnt', 'have', 'he',
  'hence', 'her', 'here', 'hereafter', 'hereby', 'herein',
  'hereupon', 'hers', 'herself', 'him', 'himself', 'his',
  'how', 'however', 'hundred', 'i', 'ie', 'if',
  'in', 'inc', 'indeed', 'interest', 'into', 'is',
  'it', 'its', 'itself', 'keep', 'last', 'latter',
  'latterly', 'least', 'less', 'ltd', 'made', 'many',
  'may', 'me', 'meanwhile', 'might', 'mill', 'mine',
  'more', 'moreover', 'most', 'mostly', 'move', 'much',
  'must', 'my', 'myself', 'name', 'namely', 'neither',
  'never', 'nevertheless', 'next', 'nine', 'no', 'nobody',
  'none', 'noone', 'nor', 'not', 'nothing', 'now',
  'nowhere', 'of', 'off', 'often', 'on', 'once',
  'one', 'only', 'onto', 'or', 'other', 'others',
  'otherwise', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'part', 'per', 'perhaps', 'please', 'put',
  'rather', 're', 'same', 'see', 'seem', 'seemed',
  'seeming', 'seems', 'serious', 'several', 'she', 'should',
  'show', 'side', 'since', 'sincere', 'six', 'sixty',
  'so', 'some', 'somehow', 'someone', 'something', 'sometime',
  'sometimes', 'somewhere', 'still', 'such', 'system', 'take',
  'ten', 'than', 'that', 'the', 'their', 'them',
  'themselves', 'then', 'thence', 'there', 'thereafter', 'thereby',
  'therefore', 'therein', 'thereupon', 'these', 'they', 'thick',
  'thin', 'third', 'this', 'those', 'though', 'three',
  'through', 'throughout', 'thru', 'thus', 'to', 'together',
  'too', 'top', 'toward', 'towards', 'twelve', 'twenty',
  'two', 'un', 'under', 'until', 'up', 'upon',
  'us', 'very', 'via', 'was', 'we', 'well',
  'were', 'what', 'whatever', 'when', 'whence', 'whenever',
  'where', 'whereafter', 'whereas', 'whereby', 'wherein', 'whereupon',
  'wherever', 'whether', 'which', 'while', 'whither', 'who',
  'whoever', 'whole', 'whom', 'whose', 'why', 'will',
  'with', 'within', 'without', 'would', 'yet', 'you', 'your', 'yours',
  'yourself', 'yourselves'
  ];

  var assumedProbSpam = 0.0;

  // Filter and tokenize the string

  var tokenizer : function(string){
    var strRegex = new RegExp(/s+/);
    var tokens = string.split(strRegex);
    var filteredTokens = [ ];
    for(var tok in tokens){
        if(stopWords.indexOf(tok) == -1){
            filteredTokens.push(tok);
        }
    }
    return filteredTokens;
  };

// Public methods
return {
    setAssumedProb : function(prob){
        assumedProbSpam = prob;
    },
    setWordlist : function(w){
        wordList = w;
    },
    getWordList : function(){
        return wordList;
    },
    // will set { 'word' : { count: 292, spam: 0.xxx, ham: 0.xxx } }
    // in wordlist
    processMessage : function(msg){
        //TODO: Needs to tokenize message
        //TODO: Needs to set the assumed probability as either P(evidence)
        //TODO: or as P(spam)
        //TODO: Needs to rank each word and update word counts
        //TODO: Needs to return the overall spam probability of the message
    }
}

})();

// Web worker event listener

self.addEventListener('message',function(e){
    var data = e.data;
    switch(data.cmd){
        'start':
            Spam.setWordlist(JSON.parse(data.msg));
            break;
        'process-message':
            // Process message needs to return the wordlist after modifying the
            // probabilities
            // the data.msg needs to have the hash and message so that it can
            // be identified by the client
            var spamProb = Spam.processMessage(JSON.parse(data.msg)));
            self.postMessage({cmd: 'message-spam-prob', data: spamProb });
            break;
        'process-inbound-spam':
            // if a message is flagged as spam by a user, we should
            // temporarily adjust the weights for the given message as we have
            // a higher probability that this message is spam, let's say
            // a positive signal from a user sets a default 75% probability
            // that a given message is spam, the assumed probability
            break;
    }
});