import { feature } from 'bun:bundle'
import { shouldAutoEnableOpenCodeInChrome } from 'src/utils/openCodeInChrome/setup.js'
import { registerBatchSkill } from './batch.js'
import { registerOpenCodeInChromeSkill } from './openCodeInChrome.js'
import { registerDebugSkill } from './debug.js'
import { registerKeybindingsSkill } from './keybindings.js'
import { registerLoremIpsumSkill } from './loremIpsum.js'
import { registerRememberSkill } from './remember.js'
import { registerSimplifySkill } from './simplify.js'
import { registerSkillifySkill } from './skillify.js'
import { registerStuckSkill } from './stuck.js'
import { registerUpdateConfigSkill } from './updateConfig.js'
import { registerVerifySkill } from './verify.js'
export function initBundledSkills(): void {
  registerUpdateConfigSkill()
  registerKeybindingsSkill()
  registerVerifySkill()
  registerDebugSkill()
  registerLoremIpsumSkill()
  registerSkillifySkill()
  registerRememberSkill()
  registerSimplifySkill()
  registerBatchSkill()
  registerStuckSkill()
  if (feature('SCHEDULER') || feature('SCHEDULER_DREAM')) {
    const { registerDreamSkill } = require('./dream.js')
    registerDreamSkill()
  }
  if (feature('REVIEW_ARTIFACT')) {
    const { registerHunterSkill } = require('./hunter.js')
    registerHunterSkill()
  }
  if (feature('AGENT_TRIGGERS')) {
    const { registerLoopSkill } = require('./loop.js')
    registerLoopSkill()
  }
  if (feature('AGENT_TRIGGERS_REMOTE')) {
    const {
      registerScheduleRemoteAgentsSkill,
    } = require('./scheduleRemoteAgents.js')
    registerScheduleRemoteAgentsSkill()
  }
  if (feature('BUILDING_OPEN_CODE_APPS')) {
    const { registerOpenCodeApiSkill } = require('./openCodeApi.js')
    registerOpenCodeApiSkill()
  }
  if (shouldAutoEnableOpenCodeInChrome()) {
    registerOpenCodeInChromeSkill()
  }
  if (feature('RUN_SKILL_GENERATOR')) {
    const { registerRunSkillGeneratorSkill } = require('./runSkillGenerator.js')
    registerRunSkillGeneratorSkill()
  }
}
