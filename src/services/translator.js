const https = require('https');

const MAX_LENGTH = 500;

function parseTimeRemaining(text) {
  const timeMatch = text.match(/NEXT AVAILABLE IN\s+(\d+)\s+HOURS?\s+(\d+)\s+MINUTES?(?:\s+(\d+)\s+SECONDS?)?/i);
  
  if (!timeMatch) {
    return 'Please try again later';
  }
  
  const hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
  
  if (hours > 0) {
    return `Limit resets in ${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `Limit resets in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `Limit resets in ${seconds} second${seconds > 1 ? 's' : ''}`;
  }
}

function translateText(text) {
  return new Promise((resolve, reject) => {
    let textToTranslate = text.trim();
    let wasTruncated = false;
    
    if (textToTranslate.length > MAX_LENGTH) {
      textToTranslate = textToTranslate.substring(0, MAX_LENGTH);
      wasTruncated = true;
    }
    
    const encodedText = encodeURIComponent(textToTranslate);
    const apiPath = `/get?q=${encodedText}&langpair=de|en`;
    
    const options = {
      hostname: 'api.mymemory.translated.net',
      path: apiPath,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
            const response = JSON.parse(data);
            if (response.responseData && response.responseData.translatedText) {
              let translation = response.responseData.translatedText;
              
              if (translation.includes('USED ALL AVAILABLE FREE TRANSLATIONS') || translation.includes('MYMEMORY WARNING')) {
                const timeMsg = parseTimeRemaining(translation);
                reject(new Error(`The daily 5000 character request limit has been reached. This is a free demo developed with free MyMemory translation service. ${timeMsg}.`));
                return;
              }
              
              if (translation.includes('QUERY LENGTH LIMIT')) {
                reject(new Error('The selected text is too long. Please select a shorter text area.'));
                return;
              }
              resolve({ text: translation, wasTruncated });
            } else {
            }
        } else if (res.statusCode === 429 || res.statusCode === 403) {
          reject(new Error('Unable to translate. Please try again.'));
        } else {
          reject(new Error('Translation service unavailable.'));
        }
      });
    });
    req.on('error', () => {
      reject(new Error('Cannot connect to translation service. Please check your internet connection.'));
    });
    req.end();
  });
}

module.exports = {
  translateText,
  MAX_LENGTH
};
