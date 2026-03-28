module.exports = {
  defaults: {
    child: '/images/png/avatar/default/child-default.png',
    adult: '/images/png/avatar/default/adult-default.png',
    self: '/images/png/avatar/default/self-default.png'
  },
  presets: [
    {
      key: 'child_male_01',
      audience: 'child',
      genders: ['male'],
      roles: ['child'],
      path: '/images/png/avatar/child/child_male_01.png',
      cloudPath: 'avatar/child/child_male_01.png'
    },
    {
      key: 'child_female_01',
      audience: 'child',
      genders: ['female'],
      roles: ['child'],
      path: '/images/png/avatar/child/child_female_01.png',
      cloudPath: 'avatar/child/child_female_01.png'
    },
    {
      key: 'child_male_02',
      audience: 'child',
      genders: ['male'],
      roles: ['child'],
      path: '/images/png/avatar/child/child_male_01.png',
      cloudPath: 'avatar/child/child_male_02.png'
    },
    {
      key: 'child_female_02',
      audience: 'child',
      genders: ['female'],
      roles: ['child'],
      path: '/images/png/avatar/child/child_female_01.png',
      cloudPath: 'avatar/child/child_female_02.png'
    },
    {
      key: 'adult_male_01',
      audience: 'adult',
      genders: ['male'],
      roles: ['dad', 'grandpa', 'other'],
      path: '/images/png/avatar/adult/adult_male_01.png',
      cloudPath: 'avatar/adult/adult_male_01.png'
    },
    {
      key: 'adult_female_01',
      audience: 'adult',
      genders: ['female'],
      roles: ['mom', 'grandma', 'other'],
      path: '/images/png/avatar/adult/adult_female_01.png',
      cloudPath: 'avatar/adult/adult_female_01.png'
    },
    {
      key: 'adult_male_02',
      audience: 'adult',
      genders: ['male'],
      roles: ['dad', 'grandpa', 'other'],
      path: '/images/png/avatar/adult/adult_male_02.png',
      cloudPath: 'avatar/adult/adult_male_02.png'
    },
    {
      key: 'adult_female_02',
      audience: 'adult',
      genders: ['female'],
      roles: ['mom', 'grandma', 'other'],
      path: '/images/png/avatar/adult/adult_female_02.png',
      cloudPath: 'avatar/adult/adult_female_02.png'
    },
    {
      key: 'adult_neutral_01',
      audience: 'adult',
      genders: ['neutral', 'male', 'female'],
      roles: ['dad', 'mom', 'grandpa', 'grandma', 'other'],
      path: '/images/png/avatar/default/adult-default.png',
      cloudPath: 'avatar/adult/adult_neutral_01.png'
    }
  ],
  legacyKeyMap: {
    'avatar-1': 'child_male_01',
    'avatar-2': 'child_female_01',
    'avatar-3': 'child_male_02',
    'avatar-4': 'child_female_02'
  }
}
