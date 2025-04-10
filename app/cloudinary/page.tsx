'use client'

import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/combobox'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { getRandomIdeas, imageDesigns } from '../../prompts'
import { Switch } from '@/components/ui/switch'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import * as fal from '@fal-ai/serverless-client'

// Cloudinary search function
const searchCloudinaryImages = async (query = 'nature', maxResults = 20) => {
  try {
    const response = await fetch('/api/cloudinary-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Referrer-Policy": "no-referrer-when-downgrade"
      },
      body: JSON.stringify({ query, maxResults }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch images from Cloudinary');
    }
    
    const data = await response.json();
    return data.imageUrl;
  } catch (err) {
    console.error('Error searching for images:', err);
    throw new Error('Failed to fetch images from Cloudinary');
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

export default function CloudinaryPage() {
  const [input, setInput] = useState('')
  const [keywords, setKeywords] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [searchingCloudinary, setSearchingCloudinary] = useState(false)
  const [cloudinaryImage, setCloudinaryImage] = useState<string | null>(null)
  const [results, setResults] = useState<any[]>([])
  const [isClient, setIsClient] = useState<boolean>(false)
  const [showIdeas, setShowIdeas] = useState(true)
  const [ideas, setIdeas] = useState<any>(getRandomIdeas())
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
    value: 'stable-cascade',
    label: 'Stable Cascade'
  })

  const requiresImage = model.value === 'face-adapter'
  || model.value === 'remove-background'
  || model.value === 'illusion-diffusion'
  || model.value === 'stable-video-diffusion'

  const requiresInput = model.value !== 'remove-background' && model.value !== 'stable-video-diffusion'
  const showImages = model.value === 'illusion-diffusion'
  const isRealTime = model.value === 'real-time'

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
  
  function onSwitchChange() {
    setShowIdeas(!showIdeas)
    scroll()
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

  async function generate(_input = input) {
    // Validate inputs
    if (!keywords) return toast('Please enter keywords for Cloudinary search.')
    if (!_input && requiresInput) return toast('Please set a prompt.')
    
    // Set up state for generation
    const _model = model
    setFile(null)
    setInput('')
    setSearchingCloudinary(true)
    setUpdating('Searching Cloudinary...')
    scroll()
    
    try {
      // Search Cloudinary with keywords
      const cloudinaryImageUrl = await searchCloudinaryImages(keywords);
      setCloudinaryImage(cloudinaryImageUrl);
      setUpdating('Generating using Cloudinary image...');
      
      // Include keywords in the prompt if they exist
      const finalPrompt = `${keywords}: ${_input}`;
      
      // Call API with the cloudinary image URL
      const params = fetchModelParams(_model.value, finalPrompt, cloudinaryImageUrl);
      console.log('params: ', params);
      
      if (params.type === 'subscribe') {
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
          let responseContext = 'Background removed.'
          if (_model.value === 'stable-video-diffusion') {
            responseContext = 'Video generated from Cloudinary image.'
          }
          if (_model.value === 'face-adapter') {
            responseContext = 'Face adapter with Cloudinary image.'
          }
          setResults([...results, {
            type: 'image',
            url: result.image.url,
            prompt: responseContext,
            sourceImage: cloudinaryImageUrl
          }])
        }
        if (result.images) {
          console.log('result: ', result)
          setResults([...results, {
            type: 'image',
            url: result.images[0].url,
            prompt: finalPrompt,
            sourceImage: cloudinaryImageUrl
          }])
        }
        if (result.video) {
          console.log('result: ', result)
          setResults([...results, {
            type: 'video',
            url: result.video.url,
            prompt: finalPrompt,
            sourceImage: cloudinaryImageUrl
          }])
        }
        
        setUpdating(null)
        setSearchingCloudinary(false)
        setKeywords('')
        console.log('result: ', result)
        setIdeas(getRandomIdeas())
        scroll()
      }
    } catch (err) {
      console.log('err : ', err)
      setUpdating(null)
      setSearchingCloudinary(false)
      toast('Error: ' + (err || 'Failed to generate content'));
    }
  }

  return (
    <main className='
    p-4 pt-0 md:p-12 md:pt-0 flex-col'>
      <div className='
      py-6 flex'>
        <a href='https://cloudinary.com/' target='_blank'>
          <div className='
          p-1 px-3 rounded
          bg-secondary'>
            <p
              className='text-sm'
            >⚡️ &nbsp;&nbsp;Check out more about <span className='font-semibold' >Cloudinary</span>. -&gt;</p>
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
            <Switch
              className='ml-5'
              checked={showIdeas}
              onCheckedChange={onSwitchChange}
            />
            <p className='
            text-xs md:text-base
            ml-2'>{showIdeas ? 'Hide ideas': 'Show ideas'}</p>
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
        'h-[calc(100vh-380px)] md:h-[calc(100vh-330px)] '}
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
                  {result.sourceImage && (
                    <a 
                      href={result.sourceImage} 
                      target="_blank" 
                      className="block mt-1 text-blue-500 hover:underline"
                    >
                      View source Cloudinary image
                    </a>
                  )}
                </p>
              </div>
            ))
          }
          {
            cloudinaryImage && (
              <div className='mt-3 mb-5'>
                <p className='text-sm font-medium mb-2'>Source Cloudinary Image:</p>
                <img 
                  src={cloudinaryImage} 
                  width={300} 
                  height={300} 
                  className='border rounded'
                  alt='Cloudinary source image' 
                />
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
                  {updating.includes('%') ? updating : 'Generating ...'}
                  </p>
              </div>
            )
          }
          {
            !isRealTime && requiresInput && showIdeas && isClient && !updating && !searchingCloudinary && (
              <div className=' flex-col flex flex-1 justify-end mt-3'>
                <div className='
                
                flex-col md:flex-row
                flex items-center'>
                  {
                    ideas.map((item, index) => {
                      return (
                        <div
                          onClick={
                            () => {
                              setInput(item)
                              if (keywords) {
                                generate(item)
                              } else {
                                toast('Please enter keywords for Cloudinary search.')
                              }
                            }
                          }
                          key={index}
                          className='
                          w-full md:w-[400px]
                          p-3 md:p-4 
                          mb-1 md:mb-0
                          md:h-[74px]
                          overflow-y-scroll
                          hover:bg-secondary
                          cursor-pointer rounded
                          border
                          md:mr-2'>
                          <p className='text-sm'>{item}</p>
                        </div>
                      )
                    })
                  }
                  <Button
                  variant='ghost'
                  onClick={(e) => {
                    setIdeas(getRandomIdeas())
                  }}
                  className='
                  mt-1 md:mt-0
                  p-[10px]
                  rounded-full'>
                    <RefreshCw
                      className='w-5 h-5'
                    />
                  </Button>
                </div>
              </div>
            )
          }
          {
            Boolean(showImages) && !updating && (
              <div className='flex flex-wrap mt-2'>
                {
                  imageDesigns.map((image, index) => (
                    <div
                    key={index}
                    onClick={() => {
                      setImageIndex(index)
                      setFile(null)
                    }}
                    className='cursor-pointer mr-2'>
                      <img
                        className='rounded'
                        src={image}
                        width={60}
                        height={60}
                      />
                    </div>
                  ))
                }
              </div>
            )
          }
          <div ref={scrollRef} />
        </div>
      </div>
      <div className='
      flex-col md:flex-row
      mt-2 flex'>
        {
          requiresInput && (
            <>
              <Input
                onChange={e => setKeywords(e.target.value)}
                placeholder='Keyword'
                value={keywords}
                className='
                w-full md:w-[200px]
                px-3 mb-2 md:mb-0'
              />
              <Textarea
                onChange={e => setInput(e.target.value)}
                placeholder='Prompt'
                value={input}
                className='
                w-full md:w-[300px]
                md:ml-2
                px-3'
              />
            </>
          )
        }
        {
          isRealTime && showIdeas && (
            <div
              onClick={() => setInput(ideas[0])}
              key={ideas[0]}
              className='
              m-0 mt-2 p-4 w-full
              md:mr-2 md:ml-3 md:my-5 md:w-[400px]
              h-[74px]
              overflow-scroll
              hover:bg-secondary
              cursor-pointer rounded
              border flex flex-1'>
              <p className='
              flex flex-1 
              text-sm'>{ideas[0]}</p>
              <Button
                variant='ghost'
                onClick={(e) => {
                  e.stopPropagation()
                  setIdeas(getRandomIdeas())
                }}
                className='
                hover:bg-background
                ml-2 p-[10px]
                rounded-full'>
                  <RefreshCw className='w-5 h-5' />
                </Button>
            </div>
          )
        }
        {
         requiresImage && !cloudinaryImage && (
          <Button
            onClick={() => fileRef.current.click()}
            className='
            w-full md:w-[200px] md:ml-2
            text-secondary'>
            <div className='flex items-center'>
              <p>Choose image</p>
            </div>
          </Button>
         )
        }
       {
        !isRealTime && (
          <Button
            onClick={() => generate()}
            disabled={searchingCloudinary || !!updating}
            className='
            ml-0 md:ml-2
            w-full md:w-[200px]
            mt-2 md:mt-0
            hover:bg-[#4d3ec3]
            text-white bg-[#5a4bd1]'>
            { searchingCloudinary || updating ? 
            <div className='flex items-center'>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              <p>{searchingCloudinary ? 'Searching...' : 'Generating...'}</p>
            </div>
            : 'Generate' }
          </Button>
        )
       }
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
            prompt: input,
            aspect_ratio: '16:9',
            duration: '8s',
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
            aspect_ratio: '16:9',
            duration: '8s',
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
            aspect_ratio: '16:9',
            duration: '8s',
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
            aspect_ratio: '16:9',
            duration: '8s',
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
            aspect_ratio: '16:9',
            duration: '8s',
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
    default:
      return {}
  }
}