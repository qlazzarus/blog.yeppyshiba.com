(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[33],{6269:(e,t,n)=>{"use strict";n.r(t),n.d(t,{default:()=>s});var r=n(2115),o=n(5302),a=n(896),i=n(6046),l=n(5155);function s(e){let{options:t,CacheProvider:n=a.C,children:s}=e,[u]=r.useState(()=>{var e;let n=(0,o.A)({...t,key:null!==(e=null==t?void 0:t.key)&&void 0!==e?e:"mui"});n.compat=!0;let r=n.insert,a=[];return n.insert=function(){for(var e=arguments.length,o=Array(e),i=0;i<e;i++)o[i]=arguments[i];(null==t?void 0:t.enableCssLayer)&&(o[1].styles="@layer mui {".concat(o[1].styles,"}"));let[l,s]=o;return void 0===n.inserted[s.name]&&a.push({name:s.name,isGlobal:!l}),r(...o)},{cache:n,flush:()=>{let e=a;return a=[],e}}});return(0,i.useServerInsertedHTML)(()=>{let e=u.flush();if(0===e.length)return null;let n="",o=u.cache.key,a=[];return e.forEach(e=>{let{name:t,isGlobal:r}=e,i=u.cache.inserted[t];"string"==typeof i&&(r?a.push({name:t,style:i}):(n+=i,o+=" ".concat(t)))}),(0,l.jsxs)(r.Fragment,{children:[a.map(e=>{let{name:n,style:r}=e;return(0,l.jsx)("style",{nonce:null==t?void 0:t.nonce,"data-emotion":"".concat(u.cache.key,"-global ").concat(n),dangerouslySetInnerHTML:{__html:r}},n)}),n&&(0,l.jsx)("style",{nonce:null==t?void 0:t.nonce,"data-emotion":o,dangerouslySetInnerHTML:{__html:n}})]})}),(0,l.jsx)(n,{value:u.cache,children:s})}},457:(e,t,n)=>{"use strict";n.d(t,{default:()=>m});var r=n(2115),o=n(5438),a=n(2567),i=n(5155);let l="function"==typeof(0,o.Dp)({}),s=(e,t)=>({WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale",boxSizing:"border-box",WebkitTextSizeAdjust:"100%",...t&&!e.vars&&{colorScheme:e.palette.mode}}),u=e=>({color:(e.vars||e).palette.text.primary,...e.typography.body1,backgroundColor:(e.vars||e).palette.background.default,"@media print":{backgroundColor:(e.vars||e).palette.common.white}}),c=function(e){var t,n;let r=arguments.length>1&&void 0!==arguments[1]&&arguments[1],o={};r&&e.colorSchemes&&"function"==typeof e.getColorSchemeSelector&&Object.entries(e.colorSchemes).forEach(t=>{var n,r;let[a,i]=t,l=e.getColorSchemeSelector(a);l.startsWith("@")?o[l]={":root":{colorScheme:null===(n=i.palette)||void 0===n?void 0:n.mode}}:o[l.replace(/\s*&/,"")]={colorScheme:null===(r=i.palette)||void 0===r?void 0:r.mode}});let a={html:s(e,r),"*, *::before, *::after":{boxSizing:"inherit"},"strong, b":{fontWeight:e.typography.fontWeightBold},body:{margin:0,...u(e),"&::backdrop":{backgroundColor:(e.vars||e).palette.background.default}},...o},i=null===(n=e.components)||void 0===n?void 0:null===(t=n.MuiCssBaseline)||void 0===t?void 0:t.styleOverrides;return i&&(a=[a,i]),a},d="mui-ecs",f=e=>{let t=c(e,!1),n=Array.isArray(t)?t[0]:t;return!e.vars&&n&&(n.html[":root:has(".concat(d,")")]={colorScheme:e.palette.mode}),e.colorSchemes&&Object.entries(e.colorSchemes).forEach(t=>{var r,o;let[a,i]=t,l=e.getColorSchemeSelector(a);l.startsWith("@")?n[l]={[":root:not(:has(.".concat(d,"))")]:{colorScheme:null===(r=i.palette)||void 0===r?void 0:r.mode}}:n[l.replace(/\s*&/,"")]={["&:not(:has(.".concat(d,"))")]:{colorScheme:null===(o=i.palette)||void 0===o?void 0:o.mode}}}),t},p=(0,o.Dp)(l?e=>{let{theme:t,enableColorScheme:n}=e;return c(t,n)}:e=>{let{theme:t}=e;return f(t)}),m=function(e){let{children:t,enableColorScheme:n=!1}=(0,a.b)({props:e,name:"MuiCssBaseline"});return(0,i.jsxs)(r.Fragment,{children:[l&&(0,i.jsx)(p,{enableColorScheme:n}),!l&&!n&&(0,i.jsx)("span",{className:d,style:{display:"none"}}),t]})}},4527:(e,t,n)=>{"use strict";n.d(t,{default:()=>s}),n(2115);var r=n(9283),o=n(6366),a=n(5155);function i(e){let{theme:t,...n}=e,i=o.A in t?t[o.A]:void 0;return(0,a.jsx)(r.default,{...n,themeId:i?o.A:void 0,theme:i||t})}var l=n(3226);function s(e){let{theme:t,...n}=e;return"function"!=typeof t&&"colorSchemes"in(o.A in t?t[o.A]:t)?(0,a.jsx)(l.CssVarsProvider,{theme:t,...n}):(0,a.jsx)(i,{theme:t,...n})}},5651:(e,t,n)=>{"use strict";n.d(t,{A:()=>i});var r=n(7165);function o(e){return String(parseFloat(e)).length===String(e).length}function a(e){return parseFloat(e)}function i(e){var t;let n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},{breakpoints:i=["sm","md","lg"],disableAlign:l=!1,factor:s=2,variants:u=["h1","h2","h3","h4","h5","h6","subtitle1","subtitle2","body1","body2","caption","button","overline"]}=n,c={...e};c.typography={...c.typography};let d=c.typography,f=(t=d.htmlFontSize,(e,n)=>{let r=String(e).match(/[\d.\-+]*\s*(.*)/)[1]||"";if(r===n)return e;let o=a(e);"px"!==r&&("em"===r?o=a(e)*a(t):"rem"===r&&(o=a(e)*a(t)));let i=o;if("px"!==n){if("em"===n)i=o/a(t);else{if("rem"!==n)return e;i=o/a(t)}}return parseFloat(i.toFixed(5))+n}),p=i.map(e=>c.breakpoints.values[e]);return u.forEach(e=>{let t=d[e];if(!t)return;let n=parseFloat(f(t.fontSize,"rem"));if(n<=1)return;let{lineHeight:a}=t;if(!o(a)&&!l)throw Error((0,r.A)(6));o(a)||(a=parseFloat(f(a,"rem"))/parseFloat(n));let i=null;l||(i=e=>(function(e){let{size:t,grid:n}=e,r=t-t%n,o=r+n;return t-r<o-t?r:o})({size:e,grid:function(e){let{lineHeight:t,pixels:n,htmlFontSize:r}=e;return n/(t*r)}({pixels:4,lineHeight:a,htmlFontSize:d.htmlFontSize})})),d[e]={...t,...function(e){let{cssProperty:t,min:n,max:r,unit:o="rem",breakpoints:a=[600,900,1200],transform:i=null}=e,l={[t]:"".concat(n).concat(o)},s=(r-n)/a[a.length-1];return a.forEach(e=>{let r=n+s*e;null!==i&&(r=i(r)),l["@media (min-width:".concat(e,"px)")]={[t]:"".concat(Math.round(1e4*r)/1e4).concat(o)}}),l}({cssProperty:"fontSize",min:1+(n-1)/s,max:n,unit:"rem",breakpoints:p,transform:i})}}),c}},9757:(e,t,n)=>{"use strict";n.d(t,{default:()=>i});var r=n(4413),o=n(2739),a=n(6366);function i(e){let{props:t,name:n}=e;return(0,r.default)({props:t,name:n,defaultTheme:o.A,themeId:a.A})}},2806:(e,t,n)=>{"use strict";let r;n.d(t,{default:()=>s}),n(2115);var o=n(896),a=n(5302),i=n(8029),l=n(5155);function s(e){let{injectFirst:t,children:n}=e;return t&&r?(0,l.jsx)(o.C,{value:r,children:n}):n}"object"==typeof document&&(r=(e=>{let t=(0,a.A)(e);class n extends i.v{constructor(e){super(e),this.prepend=t.sheet.prepend}}return t.sheet=new n({key:t.key,nonce:t.sheet.nonce,container:t.sheet.container,speedy:t.sheet.isSpeedy,prepend:t.sheet.prepend,insertionPoint:t.sheet.insertionPoint}),t})({key:"css",prepend:!0}))},6536:(e,t,n)=>{"use strict";n.d(t,{default:()=>i});var r=n(2795),o=n(5129);let a=(0,n(1045).A)("MuiBox",["root"]),i=(0,o.default)({defaultClassName:a.root,generateClassName:r.A.generate})},6681:(e,t,n)=>{"use strict";n.d(t,{default:()=>r});let r=(0,n(5949).A)()},6799:(e,t,n)=>{"use strict";n.r(t),n.d(t,{default:()=>r});let r=(0,n(6123).A)()},6123:(e,t,n)=>{"use strict";n.d(t,{A:()=>T});var r=n(2115),o=n(3463),a=n(4581),i=n(7157),l=n(7123),s=n(4577),u=n(4413),c=n(6307),d=n(2611),f=n(5212);let p=(e,t)=>e.filter(e=>t.includes(e)),m=(e,t,n)=>{let r=e.keys[0];Array.isArray(t)?t.forEach((t,r)=>{n((t,n)=>{r<=e.keys.length-1&&(0===r?Object.assign(t,n):t[e.up(e.keys[r])]=n)},t)}):t&&"object"==typeof t?(Object.keys(t).length>e.keys.length?e.keys:p(e.keys,Object.keys(t))).forEach(o=>{if(e.keys.includes(o)){let a=t[o];void 0!==a&&n((t,n)=>{r===o?Object.assign(t,n):t[e.up(o)]=n},a)}}):("number"==typeof t||"string"==typeof t)&&n((e,t)=>{Object.assign(e,t)},t)};function h(e){return`--Grid-${e}Spacing`}function g(e){return`--Grid-parent-${e}Spacing`}let y="--Grid-columns",v="--Grid-parent-columns",b=({theme:e,ownerState:t})=>{let n={};return m(e.breakpoints,t.size,(e,t)=>{let r={};"grow"===t&&(r={flexBasis:0,flexGrow:1,maxWidth:"100%"}),"auto"===t&&(r={flexBasis:"auto",flexGrow:0,flexShrink:0,maxWidth:"none",width:"auto"}),"number"==typeof t&&(r={flexGrow:0,flexBasis:"auto",width:`calc(100% * ${t} / var(${v}) - (var(${v}) - ${t}) * (var(${g("column")}) / var(${v})))`}),e(n,r)}),n},w=({theme:e,ownerState:t})=>{let n={};return m(e.breakpoints,t.offset,(e,t)=>{let r={};"auto"===t&&(r={marginLeft:"auto"}),"number"==typeof t&&(r={marginLeft:0===t?"0px":`calc(100% * ${t} / var(${v}) + var(${g("column")}) * ${t} / var(${v}))`}),e(n,r)}),n},x=({theme:e,ownerState:t})=>{if(!t.container)return{};let n={[y]:12};return m(e.breakpoints,t.columns,(e,t)=>{let r=t??12;e(n,{[y]:r,"> *":{[v]:r}})}),n},S=({theme:e,ownerState:t})=>{if(!t.container)return{};let n={};return m(e.breakpoints,t.rowSpacing,(t,r)=>{let o="string"==typeof r?r:e.spacing?.(r);t(n,{[h("row")]:o,"> *":{[g("row")]:o}})}),n},_=({theme:e,ownerState:t})=>{if(!t.container)return{};let n={};return m(e.breakpoints,t.columnSpacing,(t,r)=>{let o="string"==typeof r?r:e.spacing?.(r);t(n,{[h("column")]:o,"> *":{[g("column")]:o}})}),n},k=({theme:e,ownerState:t})=>{if(!t.container)return{};let n={};return m(e.breakpoints,t.direction,(e,t)=>{e(n,{flexDirection:t})}),n},j=({ownerState:e})=>({minWidth:0,boxSizing:"border-box",...e.container&&{display:"flex",flexWrap:"wrap",...e.wrap&&"wrap"!==e.wrap&&{flexWrap:e.wrap},gap:`var(${h("row")}) var(${h("column")})`}}),A=e=>{let t=[];return Object.entries(e).forEach(([e,n])=>{!1!==n&&void 0!==n&&t.push(`grid-${e}-${String(n)}`)}),t},E=(e,t="xs")=>{function n(e){return void 0!==e&&("string"==typeof e&&!Number.isNaN(Number(e))||"number"==typeof e&&e>0)}if(n(e))return[`spacing-${t}-${String(e)}`];if("object"==typeof e&&!Array.isArray(e)){let t=[];return Object.entries(e).forEach(([e,r])=>{n(r)&&t.push(`spacing-${e}-${String(r)}`)}),t}return[]},M=e=>void 0===e?[]:"object"==typeof e?Object.entries(e).map(([e,t])=>`direction-${e}-${t}`):[`direction-xs-${String(e)}`];var L=n(5155);let O=(0,f.A)(),C=(0,s.A)("div",{name:"MuiGrid",slot:"Root",overridesResolver:(e,t)=>t.root});function I(e){return(0,u.default)({props:e,name:"MuiGrid",defaultTheme:O})}function T(e={}){let{createStyledComponent:t=C,useThemeProps:n=I,useTheme:s=c.default,componentName:u="MuiGrid"}=e,f=(e,t)=>{let{container:n,direction:r,spacing:o,wrap:a,size:s}=e,c={root:["root",n&&"container","wrap"!==a&&`wrap-xs-${String(a)}`,...M(r),...A(s),...n?E(o,t.breakpoints.keys[0]):[]]};return(0,l.A)(c,e=>(0,i.Ay)(u,e),{})};function p(e,t,n=()=>!0){let r={};return null===e||(Array.isArray(e)?e.forEach((e,o)=>{null!==e&&n(e)&&t.keys[o]&&(r[t.keys[o]]=e)}):"object"==typeof e?Object.keys(e).forEach(t=>{let o=e[t];null!=o&&n(o)&&(r[t]=o)}):r[t.keys[0]]=e),r}let m=t(x,_,S,b,k,j,w),h=r.forwardRef(function(e,t){let i=s(),l=n(e),u=(0,d.A)(l),{className:c,children:h,columns:g=12,container:y=!1,component:v="div",direction:b="row",wrap:w="wrap",size:x={},offset:S={},spacing:_=0,rowSpacing:k=_,columnSpacing:j=_,unstable_level:A=0,...E}=u,M=p(x,i.breakpoints,e=>!1!==e),O=p(S,i.breakpoints),C=e.columns??(A?void 0:g),I=e.spacing??(A?void 0:_),T=e.rowSpacing??e.spacing??(A?void 0:k),$=e.columnSpacing??e.spacing??(A?void 0:j),F={...u,level:A,columns:C,container:y,direction:b,wrap:w,spacing:I,rowSpacing:T,columnSpacing:$,size:M,offset:O},P=f(F,i);return(0,L.jsx)(m,{ref:t,as:v,ownerState:F,className:(0,o.A)(P.root,c),...E,children:r.Children.map(h,e=>r.isValidElement(e)&&(0,a.A)(e,["Grid"])&&y&&e.props.container?r.cloneElement(e,{unstable_level:e.props?.unstable_level??A+1}):e)})});return h.muiName="Grid",h}},697:(e,t,n)=>{"use strict";n.r(t),n.d(t,{default:()=>w});var r=n(2115),o=n(3463),a=n(2181),i=n(7157),l=n(7123),s=n(4577),u=n(4413),c=n(2611),d=n(5212),f=n(7365),p=n(5374),m=n(5155);let h=(0,d.A)(),g=(0,s.A)("div",{name:"MuiStack",slot:"Root",overridesResolver:(e,t)=>t.root});function y(e){return(0,u.default)({props:e,name:"MuiStack",defaultTheme:h})}let v=e=>({row:"Left","row-reverse":"Right",column:"Top","column-reverse":"Bottom"})[e],b=({ownerState:e,theme:t})=>{let n={display:"flex",flexDirection:"column",...(0,f.NI)({theme:t},(0,f.kW)({values:e.direction,breakpoints:t.breakpoints.values}),e=>({flexDirection:e}))};if(e.spacing){let r=(0,p.LX)(t),o=Object.keys(t.breakpoints.values).reduce((t,n)=>(("object"==typeof e.spacing&&null!=e.spacing[n]||"object"==typeof e.direction&&null!=e.direction[n])&&(t[n]=!0),t),{}),i=(0,f.kW)({values:e.direction,base:o}),l=(0,f.kW)({values:e.spacing,base:o});"object"==typeof i&&Object.keys(i).forEach((e,t,n)=>{if(!i[e]){let r=t>0?i[n[t-1]]:"column";i[e]=r}}),n=(0,a.A)(n,(0,f.NI)({theme:t},l,(t,n)=>e.useFlexGap?{gap:(0,p._W)(r,t)}:{"& > :not(style):not(style)":{margin:0},"& > :not(style) ~ :not(style)":{[`margin${v(n?i[n]:e.direction)}`]:(0,p._W)(r,t)}}))}return(0,f.iZ)(t.breakpoints,n)},w=function(e={}){let{createStyledComponent:t=g,useThemeProps:n=y,componentName:a="MuiStack"}=e,s=()=>(0,l.A)({root:["root"]},e=>(0,i.Ay)(a,e),{}),u=t(b);return r.forwardRef(function(e,t){let a=n(e),{component:i="div",direction:l="column",spacing:d=0,divider:f,children:p,className:h,useFlexGap:g=!1,...y}=(0,c.A)(a),v=s();return(0,m.jsx)(u,{as:i,ownerState:{direction:l,spacing:d,useFlexGap:g},ref:t,className:(0,o.A)(v.root,h),...y,children:f?function(e,t){let n=r.Children.toArray(e).filter(Boolean);return n.reduce((e,o,a)=>(e.push(o),a<n.length-1&&e.push(r.cloneElement(t,{key:`separator-${a}`})),e),[])}(p,f):p})})}()},1297:(e,t,n)=>{"use strict";n.r(t),n.d(t,{default:()=>c,unstable_createUseMediaQuery:()=>u});var r,o=n(2115),a=n(4969),i=n(2326),l=n(1077);let s={...r||(r=n.t(o,2))}.useSyncExternalStore;function u(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},{themeId:t}=e;return function(e){let n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=(0,l.default)();r&&t&&(r=r[t]||r);let u="undefined"!=typeof window&&void 0!==window.matchMedia,{defaultMatches:c=!1,matchMedia:d=u?window.matchMedia:null,ssrMatchMedia:f=null,noSsr:p=!1}=(0,i.A)({name:"MuiUseMediaQuery",props:n,theme:r}),m="function"==typeof e?e(r):e;return(void 0!==s?function(e,t,n,r,a){let i=o.useCallback(()=>t,[t]),l=o.useMemo(()=>{if(a&&n)return()=>n(e).matches;if(null!==r){let{matches:t}=r(e);return()=>t}return i},[i,e,r,a,n]),[u,c]=o.useMemo(()=>{if(null===n)return[i,()=>()=>{}];let t=n(e);return[()=>t.matches,e=>(t.addEventListener("change",e),()=>{t.removeEventListener("change",e)})]},[i,n,e]);return s(c,u,l)}:function(e,t,n,r,i){let[l,s]=o.useState(()=>i&&n?n(e).matches:r?r(e).matches:t);return(0,a.default)(()=>{if(!n)return;let t=n(e),r=()=>{s(t.matches)};return r(),t.addEventListener("change",r),()=>{t.removeEventListener("change",r)}},[e,n]),l})(m=m.replace(/^@media( ?)/m,""),c,d,f,p)}}let c=u()},2989:(e,t,n)=>{"use strict";n.d(t,{default:()=>o});var r=n(2115);function o(e){let{controlled:t,default:n,name:o,state:a="value"}=e,{current:i}=r.useRef(void 0!==t),[l,s]=r.useState(n),u=r.useCallback(e=>{i||s(e)},[]);return[i?t:l,u]}},293:(e,t,n)=>{"use strict";n.d(t,{default:()=>l});var r,o=n(2115);let a=0,i={...r||(r=n.t(o,2))}.useId;function l(e){if(void 0!==i){let t=i();return null!=e?e:t}return function(e){let[t,n]=o.useState(e),r=e||t;return o.useEffect(()=>{null==t&&(a+=1,n("mui-".concat(a)))},[t]),r}(e)}},4761:(e,t,n)=>{"use strict";n.r(t),n.d(t,{default:()=>p,teardown:()=>f});var r=n(2115),o=n(9183);let a=!0,i=!1,l=new o.Timeout,s={text:!0,search:!0,url:!0,tel:!0,email:!0,password:!0,number:!0,date:!0,month:!0,week:!0,time:!0,datetime:!0,"datetime-local":!0};function u(e){e.metaKey||e.altKey||e.ctrlKey||(a=!0)}function c(){a=!1}function d(){"hidden"===this.visibilityState&&i&&(a=!0)}function f(e){e.removeEventListener("keydown",u,!0),e.removeEventListener("mousedown",c,!0),e.removeEventListener("pointerdown",c,!0),e.removeEventListener("touchstart",c,!0),e.removeEventListener("visibilitychange",d,!0)}function p(){let e=r.useCallback(e=>{if(null!=e){var t;(t=e.ownerDocument).addEventListener("keydown",u,!0),t.addEventListener("mousedown",c,!0),t.addEventListener("pointerdown",c,!0),t.addEventListener("touchstart",c,!0),t.addEventListener("visibilitychange",d,!0)}},[]),t=r.useRef(!1);return{isFocusVisibleRef:t,onFocus:function(e){return!!function(e){let{target:t}=e;try{return t.matches(":focus-visible")}catch(e){}return a||function(e){let{type:t,tagName:n}=e;return"INPUT"===n&&!!s[t]&&!e.readOnly||"TEXTAREA"===n&&!e.readOnly||!!e.isContentEditable}(t)}(e)&&(t.current=!0,!0)},onBlur:function(){return!!t.current&&(i=!0,l.start(100,()=>{i=!1}),t.current=!1,!0)},ref:e}}},5619:(e,t,n)=>{"use strict";n.d(t,{default:()=>o});var r=n(2115);let o=e=>{let t=r.useRef({});return r.useEffect(()=>{t.current=e}),t.current}},4509:(e,t,n)=>{"use strict";n.d(t,{default:()=>l});var r=n(9063),o=n(6302),a=n(7186),i=n(5157);let l=function(e){var t;let{elementType:n,externalSlotProps:l,ownerState:s,skipResolvingSlotProps:u=!1,...c}=e,d=u?{}:(0,i.A)(l,s),{props:f,internalRef:p}=(0,a.A)({...c,externalSlotProps:d}),m=(0,r.default)(p,null==d?void 0:d.ref,null===(t=e.additionalProps)||void 0===t?void 0:t.ref);return(0,o.A)(n,{...f,ref:m},s)}},3479:(e,t,n)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default=function(e){let{html:t,height:n=null,width:a=null,children:i,dataNtpc:l=""}=e;return(0,o.useEffect)(()=>{l&&performance.mark("mark_feature_usage",{detail:{feature:"next-third-parties-".concat(l)}})},[l]),(0,r.jsxs)(r.Fragment,{children:[i,t?(0,r.jsx)("div",{style:{height:null!=n?"".concat(n,"px"):"auto",width:null!=a?"".concat(a,"px"):"auto"},"data-ntpc":l,dangerouslySetInnerHTML:{__html:t}}):null]})};let r=n(5155),o=n(2115)},766:(e,t,n)=>{"use strict";let r;Object.defineProperty(t,"__esModule",{value:!0}),t.GoogleAnalytics=function(e){let{gaId:t,debugMode:n,dataLayerName:l="dataLayer",nonce:s}=e;return void 0===r&&(r=l),(0,a.useEffect)(()=>{performance.mark("mark_feature_usage",{detail:{feature:"next-third-parties-ga"}})},[]),(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(i.default,{id:"_next-ga-init",dangerouslySetInnerHTML:{__html:"\n          window['".concat(l,"'] = window['").concat(l,"'] || [];\n          function gtag(){window['").concat(l,"'].push(arguments);}\n          gtag('js', new Date());\n\n          gtag('config', '").concat(t,"' ").concat(n?",{ 'debug_mode': true }":"",");")},nonce:s}),(0,o.jsx)(i.default,{id:"_next-ga",src:"https://www.googletagmanager.com/gtag/js?id=".concat(t),nonce:s})]})},t.sendGAEvent=function(){for(var e=arguments.length,t=Array(e),n=0;n<e;n++)t[n]=arguments[n];if(void 0===r){console.warn("@next/third-parties: GA has not been initialized");return}window[r]?window[r].push(arguments):console.warn("@next/third-parties: GA dataLayer ".concat(r," does not exist"))};let o=n(5155),a=n(2115),i=function(e){return e&&e.__esModule?e:{default:e}}(n(6584))},96:(e,t,n)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.sendGTMEvent=void 0,t.GoogleTagManager=function(e){let{gtmId:t,gtmScriptUrl:n="https://www.googletagmanager.com/gtm.js",dataLayerName:l="dataLayer",auth:s,preview:u,dataLayer:c,nonce:d}=e;i=l;let f="dataLayer"!==l?"&l=".concat(l):"";return(0,o.useEffect)(()=>{performance.mark("mark_feature_usage",{detail:{feature:"next-third-parties-gtm"}})},[]),(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(a.default,{id:"_next-gtm-init",dangerouslySetInnerHTML:{__html:"\n      (function(w,l){\n        w[l]=w[l]||[];\n        w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});\n        ".concat(c?"w[l].push(".concat(JSON.stringify(c),")"):"","\n      })(window,'").concat(l,"');")},nonce:d}),(0,r.jsx)(a.default,{id:"_next-gtm","data-ntpc":"GTM",src:"".concat(n,"?id=").concat(t).concat(f).concat(s?"&gtm_auth=".concat(s):"").concat(u?"&gtm_preview=".concat(u,"&gtm_cookies_win=x"):""),nonce:d})]})};let r=n(5155),o=n(2115),a=function(e){return e&&e.__esModule?e:{default:e}}(n(6584)),i="dataLayer";t.sendGTMEvent=(e,t)=>{let n=t||i;window[n]=window[n]||[],window[n].push(e)}},6584:(e,t,n)=>{"use strict";n.r(t),n.d(t,{default:()=>o.a});var r=n(3704),o=n.n(r),a={};for(let e in r)"default"!==e&&(a[e]=()=>r[e]);n.d(t,a)},3704:(e,t,n)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var n in t)Object.defineProperty(e,n,{enumerable:!0,get:t[n]})}(t,{default:function(){return v},handleClientScriptLoad:function(){return h},initScriptLoader:function(){return g}});let r=n(306),o=n(9955),a=n(5155),i=r._(n(7650)),l=o._(n(2115)),s=n(1147),u=n(2815),c=n(8571),d=new Map,f=new Set,p=e=>{if(i.default.preinit){e.forEach(e=>{i.default.preinit(e,{as:"style"})});return}if("undefined"!=typeof window){let t=document.head;e.forEach(e=>{let n=document.createElement("link");n.type="text/css",n.rel="stylesheet",n.href=e,t.appendChild(n)})}},m=e=>{let{src:t,id:n,onLoad:r=()=>{},onReady:o=null,dangerouslySetInnerHTML:a,children:i="",strategy:l="afterInteractive",onError:s,stylesheets:c}=e,m=n||t;if(m&&f.has(m))return;if(d.has(t)){f.add(m),d.get(t).then(r,s);return}let h=()=>{o&&o(),f.add(m)},g=document.createElement("script"),y=new Promise((e,t)=>{g.addEventListener("load",function(t){e(),r&&r.call(this,t),h()}),g.addEventListener("error",function(e){t(e)})}).catch(function(e){s&&s(e)});a?(g.innerHTML=a.__html||"",h()):i?(g.textContent="string"==typeof i?i:Array.isArray(i)?i.join(""):"",h()):t&&(g.src=t,d.set(t,y)),(0,u.setAttributesFromProps)(g,e),"worker"===l&&g.setAttribute("type","text/partytown"),g.setAttribute("data-nscript",l),c&&p(c),document.body.appendChild(g)};function h(e){let{strategy:t="afterInteractive"}=e;"lazyOnload"===t?window.addEventListener("load",()=>{(0,c.requestIdleCallback)(()=>m(e))}):m(e)}function g(e){e.forEach(h),[...document.querySelectorAll('[data-nscript="beforeInteractive"]'),...document.querySelectorAll('[data-nscript="beforePageRender"]')].forEach(e=>{let t=e.id||e.getAttribute("src");f.add(t)})}function y(e){let{id:t,src:n="",onLoad:r=()=>{},onReady:o=null,strategy:u="afterInteractive",onError:d,stylesheets:p,...h}=e,{updateScripts:g,scripts:y,getIsSsr:v,appDir:b,nonce:w}=(0,l.useContext)(s.HeadManagerContext),x=(0,l.useRef)(!1);(0,l.useEffect)(()=>{let e=t||n;x.current||(o&&e&&f.has(e)&&o(),x.current=!0)},[o,t,n]);let S=(0,l.useRef)(!1);if((0,l.useEffect)(()=>{!S.current&&("afterInteractive"===u?m(e):"lazyOnload"===u&&("complete"===document.readyState?(0,c.requestIdleCallback)(()=>m(e)):window.addEventListener("load",()=>{(0,c.requestIdleCallback)(()=>m(e))})),S.current=!0)},[e,u]),("beforeInteractive"===u||"worker"===u)&&(g?(y[u]=(y[u]||[]).concat([{id:t,src:n,onLoad:r,onReady:o,onError:d,...h}]),g(y)):v&&v()?f.add(t||n):v&&!v()&&m(e)),b){if(p&&p.forEach(e=>{i.default.preinit(e,{as:"style"})}),"beforeInteractive"===u)return n?(i.default.preload(n,h.integrity?{as:"script",integrity:h.integrity,nonce:w,crossOrigin:h.crossOrigin}:{as:"script",nonce:w,crossOrigin:h.crossOrigin}),(0,a.jsx)("script",{nonce:w,dangerouslySetInnerHTML:{__html:"(self.__next_s=self.__next_s||[]).push("+JSON.stringify([n,{...h,id:t}])+")"}})):(h.dangerouslySetInnerHTML&&(h.children=h.dangerouslySetInnerHTML.__html,delete h.dangerouslySetInnerHTML),(0,a.jsx)("script",{nonce:w,dangerouslySetInnerHTML:{__html:"(self.__next_s=self.__next_s||[]).push("+JSON.stringify([0,{...h,id:t}])+")"}}));"afterInteractive"===u&&n&&i.default.preload(n,h.integrity?{as:"script",integrity:h.integrity,nonce:w,crossOrigin:h.crossOrigin}:{as:"script",nonce:w,crossOrigin:h.crossOrigin})}return null}Object.defineProperty(y,"__nextScript",{value:!0});let v=y;("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},2815:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"setAttributesFromProps",{enumerable:!0,get:function(){return a}});let n={acceptCharset:"accept-charset",className:"class",htmlFor:"for",httpEquiv:"http-equiv",noModule:"noModule"},r=["onLoad","onReady","dangerouslySetInnerHTML","children","onError","strategy","stylesheets"];function o(e){return["async","defer","noModule"].includes(e)}function a(e,t){for(let[a,i]of Object.entries(t)){if(!t.hasOwnProperty(a)||r.includes(a)||void 0===i)continue;let l=n[a]||a.toLowerCase();"SCRIPT"===e.tagName&&o(l)?e[l]=!!i:e.setAttribute(l,String(i)),(!1===i||"SCRIPT"===e.tagName&&o(l)&&(!i||"false"===i))&&(e.setAttribute(l,""),e.removeAttribute(l))}}("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},93:e=>{e.exports={style:{fontFamily:"'Roboto', 'Roboto Fallback'",fontStyle:"normal"},className:"__className_4db51b"}}}]);