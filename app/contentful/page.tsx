'use client'

import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Combobox } from '@/components/combobox'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { imageDesigns } from '../../prompts'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import * as fal from '@fal-ai/serverless-client'

// Contentful search function
const fetchContentfulData = async (slug = 'battle-of-shiloh-concludes') => {
  try {
    // Create an AbortController with a 60-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 60 seconds timeout
    
    const response = await fetch('/api/contentful-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slug }),
      signal: controller.signal,
    });
    
    // Clear the timeout to prevent memory leaks
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Failed to fetch content from Contentful');
    }
    
    const data = await response.json();
    if (!data.openGraphDescription) {
      throw new Error('No content description found');
    }
    
    return data.openGraphDescription;
  } catch (err) {
    // Check if this is an abort error (timeout)
    if (err === 'AbortError') {
      console.error('Request timed out when fetching from Contentful');
      throw new Error('Request timed out. Please try again later.');
    }
    
    console.error('Error fetching from Contentful:', err);
    throw err; // Propagate the error
  }
};

const seed = Math.floor(Math.random() * 100000)
const baseArgs = {
  sync_mode: true,
  strength: .99,
  seed
}

fal.config({
  proxyUrl: '/api/proxy',
})

const models = [
  {
    value: 'stable-cascade',
    label: 'Stable Cascade',
  },
  {
    value: 'stable-diffusion',
    label: 'Stable Diffusion',
  },
  {
    value: 'stable-video-diffusion',
    label: 'Stable Video Diffusion'
  },
  {
    value: 'gen-2-video',
    label: 'Gen-2 Video'
  },
  {
    value: 'veo2',
    label: 'Veo-2 Video'
  },
  {
    value: 'pika-labs-video',
    label: 'Pika Labs Video'
  },
  {
    value: 'animate-diff-video',
    label: 'AnimateDiff Video'
  },
  {
    value: 'svd-xt-video',
    label: 'SVD-XT Video'
  },
  {
    value: 'modelscope-video',
    label: 'ModelScope Video'
  },
  {
    value: 'zeroscope-video',
    label: 'ZeroScope Video'
  },
  {
    value: 'i2vgen-xl-video',
    label: 'I2VGen-XL Video'
  },
  {
    value: 'fooocus',
    label: 'Fooocus',
  },
  {
    value: 'face-adapter',
    label: 'Face Adapter'
  },
  {
    value: 'remove-background',
    label: 'Remove Background'
  },
  {
    value: 'illusion-diffusion',
    label: 'Illusion Diffusion'
  },
  {
    value: 'animate',
    label: 'Animate',
  },
  {
    value: 'fast-animate',
    label: 'Fast Animate'
  },
  {
    value: 'real-time',
    label: 'Real Time',
  }
]

export default function ContentfulPage() {
  const [input, setInput] = useState('')
  const [contentInput, setContentInput] = useState('') // New state for editable content
  const [updating, setUpdating] = useState<string | null>(null)
  const [searchingContentful, setSearchingContentful] = useState(false)
  const [contentfulDescription, setContentfulDescription] = useState<string | null>(null)
  const [results, setResults] = useState<any[]>([])
  const [isClient, setIsClient] = useState<boolean>(false)
  const [file, setFile] = useState<any>(null)
  const [imageIndex, setImageIndex] = useState<any>(null)
  const [excalidrawImage, setExcalidrawImage] = useState<any>(null)
  const [sceneData, setSceneData] = useState<any>(null)
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
  const [_appState, setAppState] = useState<any>(null)
  const scrollRef = useRef<any>(null)
  const fileRef = useRef<any>(null)
  const [excalidrawExportFns, setexcalidrawExportFns] = useState<any>(null)
  const [Comp, setComp] = useState<any>(null);
  useEffect(() => {
    import('@excalidraw/excalidraw').then((comp) => setComp(comp.Excalidraw))
  }, [])

  useEffect(() => {
    import('@excalidraw/excalidraw').then((module) =>
      setexcalidrawExportFns({
        exportToBlob: module.exportToBlob,
        serializeAsJSON: module.serializeAsJSON
      })
    );
  }, []);

  useEffect(() => { setIsClient(true) }, [])

  const [model, setModel] = useState({
    value: 'stable-diffusion',  // Changed default to stable diffusion for reliability
    label: 'Stable Diffusion'
  })

  const requiresImage = model.value === 'face-adapter'
  || model.value === 'remove-background'
  || model.value === 'illusion-diffusion'
  || model.value === 'stable-video-diffusion'

  const requiresInput = model.value !== 'remove-background' && model.value !== 'stable-video-diffusion'
  const showImages = model.value === 'illusion-diffusion'
  const isRealTime = model.value === 'real-time'
  const isVideoModel = model.value.includes('video')

  const { send } = fal.realtime.connect('110602490-sdxl-turbo-realtime', {
    connectionKey: 'realtime-nextjs-app',
    onResult(result) {
      if (result.error) return
      setExcalidrawImage(result.images[0].url)
    }
  })

  async function getDataUrl(appState = _appState) {
    const elements = excalidrawAPI.getSceneElements()
    if (!elements || !elements.length) return
    const blob = await excalidrawExportFns.exportToBlob({
      elements,
      exportPadding: 0,
      appState,
      quality: 0.5,
      files: excalidrawAPI.getFiles(),
      getDimensions: () => { return {width: 450, height: 450}}
    })
    return await new Promise(r => {let a=new FileReader(); a.onload=r; a.readAsDataURL(blob)}).then((e:any) => e.target.result)
  }
  
  async function onChangeFile(e) {
    const file = fileRef.current.files[0]
    if (!file) return
    setFile(file)
    setImageIndex(null)
    e.target.value = null
    scroll()
  }

  function scroll() {
    setTimeout(() => {
      scrollRef.current.scrollIntoView({
        behavior: 'smooth'
      })
    }, 100)
  }

  async function fetchSlugContent() {
    // Don't proceed if no slug is provided
    if (!input) return toast('Please enter a Contentful slug.')
    
    setSearchingContentful(true)
    setUpdating('Searching Contentful...')
    scroll()
    
    try {
      // Search Contentful with slug
      const description = await fetchContentfulData(input);
      setContentfulDescription(description);
      setContentInput(description); // Set the fetched content to the new input field
      setUpdating(null);
      setSearchingContentful(false);
    } catch (err) {
      console.log('err : ', err)
      setUpdating(null)
      setSearchingContentful(false)
      toast('Error: ' + (err || 'Failed to fetch content'))
    }
  }

  async function generate(_input = input, content = contentInput) {
    // Validate inputs
    if (!_input) return toast('Please enter a Contentful slug.')
    if (!content) return toast('Content is empty. Fetch or enter content first.')
    
    // Set up state for generation
    const _model = model
    setFile(null)
    setUpdating('Generating from content...')
    scroll()
    
    try {
      // Use the content as prompt for generation
      setContentfulDescription(content);
      const params = fetchModelParams(_model.value, content);
      console.log('params: ', params);
      
      if (params.type === 'subscribe') {
        try {
          const result:any = await fal.subscribe(params.model_name, {
            ...params.inputs as any,
            logs: true,
            onQueueUpdate: (update) => {
              if (update.status === 'IN_PROGRESS' && update.logs?.length) {
                console.log('update:', update)
                setUpdating(update.logs[update.logs.length - 1].message)
              }
            },
          }) as any;
          
          if (result.image) {
            let responseContext = 'Generated from Contentful content.'
            setResults([...results, {
              type: 'image',
              url: result.image.url,
              prompt: responseContext,
              contentDescription: content
            }])
          }
          if (result.images) {
            console.log('result: ', result)
            setResults([...results, {
              type: 'image',
              url: result.images[0].url,
              prompt: content,
              contentDescription: content
            }])
          }
          if (result.video) {
            console.log('result: ', result)
            setResults([...results, {
              type: 'video',
              url: result.video.url,
              prompt: content,
              contentDescription: content
            }])
          }
          
          setUpdating(null)
          setSearchingContentful(false)
          setInput('')
          console.log('result: ', result)
          scroll()
          
        } catch (apiError) {
          console.error('API Error:', apiError);
          setUpdating(null)
          setSearchingContentful(false)
          toast('API Error: ' + (apiError || 'Failed to generate content with the AI model'));
        }
      }
    } catch (err) {
      console.log('err : ', err)
      setUpdating(null)
      setSearchingContentful(false)
      toast('Error: ' + (err || 'Failed to generate content'));
    }
  }

  return (
    <main className='
    p-4 pt-0 md:p-12 md:pt-0 flex-col'>
      <div className='
      py-6 flex'>
        <a href='https://www.contentful.com/' target='_blank'>
          <div className='
          p-1 px-3 rounded
          bg-secondary'>
            <p
              className='text-sm'
            >⚡️ &nbsp;&nbsp;Check out more about <span className='font-semibold' >Contentful</span>. -&gt;</p>
          </div>
        </a>
      </div>
      <div className='
      flex rounded-lg border flex-1
      px-3 md:px-6 py-3 flex-col
      '>
        <div className='
        flex-col md:flex-row
        flex flex-1'>
          <div className='
          items-center
          flex flex-1'>
            <p
            className='
            text-sm
            md:text-lg font-medium'>Playground</p>
          </div>
          <div className='mt-3 md:mt-0'>
            <Combobox
              models={models}
              setModel={setModel}
              setInput={setInput}
              model={model}
              scroll={scroll}
            />
          </div>
        </div>
        <div className={`
        ${isRealTime ? 
        'h-[calc(100vh-180px)]' :
        'h-[calc(100vh-460px)] md:h-[calc(100vh-410px)]'}
        flex flex-col overflow-y overflow-scroll`}>
          {
            results.map((result) => (
              <div className='
              md:w-[400px]
              ' key={result.url}>
                {
                 (result.type === 'image') ? (
                  <a
                    href={result.url}
                    target='_blank'
                  >
                    <img
                      src={result.url}
                      width={400}
                      height={400}
                      className='
                      border-l border-r border-t
                      mt-3 rounded-t'
                      alt='Fal image'
                    />
                  </a>
                ) : (result.type === 'video') ? (
                  <a
                    href={result.url}
                    target='_blank'
                  >
                    <video
                      loop
                      src={result.url}
                      width={400}
                      height={400}
                      className='mt-3'
                      controls
                    />
                  </a>
                ) : null  
                }
                <p className='rounded-b border-l border-b border-r text-xs p-2'>
                  {result.prompt}
                  {result.contentDescription && (
                    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                      <p className="font-semibold">Contentful Content:</p>
                      <p>{result.contentDescription}</p>
                    </div>
                  )}
                </p>
              </div>
            ))
          }
          {
            contentfulDescription && (
              <div className='mt-3 mb-5'>
                <p className='text-sm font-medium mb-2'>Contentful Description:</p>
                <div className='border rounded p-3 bg-gray-50 dark:bg-gray-800'>
                  <p className='text-sm'>{contentfulDescription}</p>
                </div>
              </div>
            )
          }
          {
            requiresImage && file && <img className='mt-3' width={300} height={300} src={URL.createObjectURL(file)} />
          }
          {
            requiresImage && imageIndex !== null && <img className='mt-3' width={300} height={300} src={imageDesigns[imageIndex]} />
          }
          {
            isRealTime && isClient && (
                <div className='
                flex flex-col
                lg:flex-row
                mt-2'>
                  <div className="
                  w-[380px] h-[380px]
                  md:w-[550px] md:h-[570px] md:mr-3">
                    {
                      isClient && excalidrawExportFns && (
                        <Comp
                          excalidrawAPI={(api)=> setExcalidrawAPI({
                            ...api,
                            scrollToContent: {fitToContent: false}
                          })}
                          onChange={async (elements, appState) => {
                            const newSceneData = excalidrawExportFns.serializeAsJSON(
                              elements,
                              appState,
                              excalidrawAPI.getFiles(),
                              'local'
                            )
                            if (newSceneData !== sceneData) {
                              setAppState(appState)
                              setSceneData(newSceneData)
                              let dataUrl = await getDataUrl(appState)
                              send({
                                ...baseArgs,
                                image_url: dataUrl,
                                prompt: input,
                              })
                            }
                          }}
                        />
                      )
                    }
                  </div>
                  {
                    excalidrawImage && (
                      <img
                        src={excalidrawImage}
                        className='
                        mt-2 lg:mt-0
                        w-[400px] h-[400px]
                        '
                        alt='fal image'
                      />
                    )
                  }
                </div>
            )
          }
          {
            updating && (
              <div className='flex items-center my-5'>
                <Loader2 className='h-6 w-6 animate-spin' />
                <p className='ml-3 text-sm'>
                  {updating.includes('%') ? updating : 'Processing ...'}
                  </p>
              </div>
            )
          }
          <div ref={scrollRef} />
        </div>
      </div>
      
      {/* Input area with slug input, fetch button, and the content textarea */}
      <div className='flex-col mt-2 flex'>
        <div className='flex-col md:flex-row flex'>
          <input
            type="text"
            onChange={e => setInput(e.target.value)}
            placeholder='Slug'
            value={input}
            className='
            w-full md:w-[300px]
            px-3 py-2 rounded-md border'
          />
          
          {/* Fetch Slug button */}
          <Button
            onClick={fetchSlugContent}
            disabled={searchingContentful || !!updating}
            className='
            ml-0 md:ml-2
            w-full md:w-[150px]
            mt-2 md:mt-0
            text-white bg-blue-500 hover:bg-blue-600'>
            { searchingContentful && updating === 'Searching Contentful...' ? 
            <div className='flex items-center'>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              <p>Fetching...</p>
            </div>
            : 'Fetch Slug' }
          </Button>
          
          {/* Add other buttons like Choose Image and Real-time Generate */}
          {requiresImage && !isVideoModel && (
            <Button
              onClick={() => fileRef.current.click()}
              className='
              w-full md:w-[150px] md:ml-2
              mt-2 md:mt-0
              text-secondary'>
              <div className='flex items-center'>
                <p>Choose image</p>
              </div>
            </Button>
          )}
          
          {isRealTime && (
            <Button
              className='
              w-full md:w-[200px] md:ml-2
              mt-2 md:mt-0
              hover:bg-[#4d3ec3]
              text-white bg-[#5a4bd1]'>
              <div className='flex items-center'>
                <p>Real-time Generate</p>
              </div>
            </Button>
          )}
        </div>
        
        {/* Content textarea for editing fetched content */}
        <div className='mt-4 mb-2'>
          <p className='text-sm font-medium mb-2'>Content (editable):</p>
          <Textarea
            onChange={e => setContentInput(e.target.value)}
            placeholder='Content will appear here after fetching a slug...'
            value={contentInput}
            className='w-full min-h-[120px]'
          />
        </div>
        
        {/* Generate button */}
        {!isRealTime && (
          <Button
            onClick={() => generate()}
            disabled={searchingContentful || !!updating}
            className='
            w-full md:w-[200px]
            mt-2
            hover:bg-[#4d3ec3]
            text-white bg-[#5a4bd1]'>
            { searchingContentful || updating ? 
            <div className='flex items-center'>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              <p>{searchingContentful ? 'Searching...' : 'Generating...'}</p>
            </div>
            : 'Generate' }
          </Button>
        )}
      </div>
      
      <Toaster />
      {
        isClient && (
          <input
            onChange={onChangeFile}
            ref={fileRef}
            accept="image/*"
            type='file'
            className='hidden'
          />
        )
      }
    </main>
  )
}

function fetchModelParams(model: string, input:string, url?: string) {
  switch (model) {
    case 'stable-cascade':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/stable-cascade',
        inputs: {
          input: {
            prompt: input
          }
        }
      }
    case 'stable-video-diffusion':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/veo2',
        inputs: {
          input: {
            image_url: url
          }
        }
      }
    case 'gen-2-video':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/veo2', // Using same backend for demo
        inputs: {
          input: {
            prompt: input,
            aspect_ratio: '16:9',
            duration: '8s',
          }
        }
      }
    case 'pika-labs-video':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/veo2', // Using same backend for demo
        inputs: {
          input: {
            prompt: input,
            image_url: url,
            mode: "video"
          }
        }
      }
    case 'animate-diff-video':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/animatediff', // Using existing animate model
        inputs: {
          input: {
            prompt: input,
            image_url: url
          }
        }
      }
    case 'svd-xt-video':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/veo2', // Using same backend for demo
        inputs: {
          input: {
            prompt: input,
            image_url: url,
            mode: "extended"
          }
        }
      }
    case 'modelscope-video':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/veo2', // Using same backend for demo
        inputs: {
          input: {
            prompt: input,
            image_url: url,
            mode: "video"
          }
        }
      }
    case 'zeroscope-video':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/veo2', // Using same backend for demo
        inputs: {
          input: {
            prompt: input,
            image_url: url,
            mode: "video"
          }
        }
      }
    case 'i2vgen-xl-video':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/veo2', // Using same backend for demo
        inputs: {
          input: {
            prompt: input,
            image_url: url,
            mode: "video"
          }
        }
      }
    case 'stable-diffusion':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/fast-sdxl',
        inputs: {
          input: {
            prompt: input,
            image_url: url
          }
        }
      }
    case 'real-time':
      return {
        type: 'real-time',
        model_name: '110602490-lcm-sd15-i2i',
        inputs: {
          input: {
            prompt: input,
            image_url: url
          }
        }
      }
    case 'fooocus':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/fooocus',
        inputs: {
          input: {
            prompt: input,
            image_url: url
          }
        }
      }
    case 'animate':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/animatediff',
        inputs: {
          input: {
            prompt: input,
            image_url: url
          }
        }
      }
    case 'fast-animate':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/animatediff-lcm',
        inputs: {
          input: {
            prompt: input,
            image_url: url
          }
        }
      }
    case 'face-adapter':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/ip-adapter-face-id',
        inputs: {
          input: {
            face_image_url: url,
            prompt: input
          }
        }
      }
    case 'remove-background':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/imageutils',
        inputs: {
          path: '/rembg',
          input: {
            image_url: url,
          }
        }
      }
    case 'illusion-diffusion':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/illusion-diffusion',
        inputs: {
          input: {
            image_url: url,
            prompt: input
          }
        }
      }
      case 'veo2':
      return {
        type: 'subscribe',
        model_name: 'fal-ai/veo2',
        inputs: {
          input: {
            prompt: input,
            aspect_ratio: '16:9',
            duration: '8s',
          }
        }
      }
    default:
      return {}
  }
}